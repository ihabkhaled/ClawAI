import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import { CANDIDATE_TIMEOUT_MS, DEFAULT_CANDIDATE_MODEL } from '../constants/best-of-n.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import { QualityCheckManager } from './quality-check.manager';
import type { BestOfNMessageDto } from '../dto/best-of-n-message.dto';
import type { BestOfNResponse, CandidateResult } from '../types/best-of-n.types';
import type { OllamaGenerateRequest, OllamaGenerateResponse } from '../types/execution.types';
import { RoutingMode } from '../../../generated/prisma';

@Injectable()
export class BestOfNManager {
  private readonly logger = new Logger(BestOfNManager.name);

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
    private readonly qualityCheckManager: QualityCheckManager,
  ) {}

  async executeBestOfN(userId: string, dto: BestOfNMessageDto): Promise<BestOfNResponse> {
    this.logger.log(`executeBestOfN: starting for user ${userId}, n=${String(dto.n)}`);

    const threadId = await this.resolveThreadId(userId, dto);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: dto.content,
      metadata: { bestOfNRequest: true },
    });

    void this.executeInBackground(threadId, dto.content, dto.n, dto.models);

    return { messageId: userMessage.id, threadId };
  }

  async executeInBackground(
    threadId: string,
    content: string,
    n: number,
    models?: string[],
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const candidateModels = this.buildCandidateModels(n, models);
      const candidates = await this.runCandidates(content, candidateModels, startTime);
      const ranked = this.rankCandidates(candidates, content);
      const best = ranked[0];

      if (!best) {
        throw new Error('No candidates produced a result');
      }

      await this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: best.content,
        provider: 'local-ollama',
        model: best.model,
        latencyMs: best.latencyMs,
        usedFallback: false,
        routingMode: RoutingMode.AUTO,
        metadata: { bestOfN: true, candidates: ranked, bestRank: 1 },
      });

      this.chatStreamService.emitCompletion(threadId, 'local-ollama', best.model);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Best-of-N generation failed';
      this.logger.error(`executeInBackground: failed for thread ${threadId} - ${errorMsg}`);
      this.chatStreamService.emitError(threadId, errorMsg);
      try {
        await this.storeErrorMessage(threadId, errorMsg);
      } catch (storeError: unknown) {
        const storeMsg = storeError instanceof Error ? storeError.message : 'Store failed';
        this.logger.error(`executeInBackground: failed to store error message — ${storeMsg}`);
      }
    }
  }

  private buildCandidateModels(n: number, models?: string[]): string[] {
    if (models && models.length > 0) {
      return models;
    }
    return Array.from({ length: n }, () => DEFAULT_CANDIDATE_MODEL);
  }

  private async runCandidates(
    content: string,
    candidateModels: string[],
    startTime: number,
  ): Promise<CandidateResult[]> {
    const config = AppConfig.get();
    const results = await Promise.allSettled(
      candidateModels.map((model) =>
        this.runOneCandidate(config.OLLAMA_SERVICE_URL, model, content, startTime),
      ),
    );

    return results
      .map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        const msg = result.reason instanceof Error ? result.reason.message : 'Candidate failed';
        this.logger.warn(`runCandidates: candidate ${String(index)} failed — ${msg}`);
        return null;
      })
      .filter((c): c is CandidateResult => c !== null);
  }

  private async runOneCandidate(
    ollamaServiceUrl: string,
    model: string,
    content: string,
    _globalStartTime: number,
  ): Promise<CandidateResult> {
    const candidateStart = Date.now();
    const requestBody: OllamaGenerateRequest = {
      model,
      prompt: content,
      stream: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${ollamaServiceUrl}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: CANDIDATE_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${String(response.status)} for model ${model}`);
    }

    const latencyMs = Date.now() - candidateStart;
    const responseContent = response.data.response.trim();

    const qualityResult = this.qualityCheckManager.checkResponseQuality(
      responseContent,
      content,
    );

    return {
      content: responseContent,
      provider: 'local-ollama',
      model,
      latencyMs,
      qualityScore: qualityResult.score,
      qualityReasons: qualityResult.reasons,
      rank: 0,
    };
  }

  private rankCandidates(candidates: CandidateResult[], _content: string): CandidateResult[] {
    const sorted = [...candidates].sort((a, b) => b.qualityScore - a.qualityScore);
    return sorted.map((candidate, index) => ({ ...candidate, rank: index + 1 }));
  }

  private async resolveThreadId(userId: string, dto: BestOfNMessageDto): Promise<string> {
    if (dto.threadId && dto.threadId.length > 0) {
      return dto.threadId;
    }
    const thread = await this.chatThreadsRepository.create({
      userId,
      title: `Best-of-N: ${dto.content.slice(0, 50)}`,
      routingMode: RoutingMode.AUTO,
    });
    return thread.id;
  }

  private async storeErrorMessage(threadId: string, errorMsg: string): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content: `\u26A0\uFE0F ${errorMsg}`,
      provider: 'local-ollama',
      model: DEFAULT_CANDIDATE_MODEL,
      routingMode: RoutingMode.AUTO,
      usedFallback: true,
      metadata: { error: true },
    });
  }
}
