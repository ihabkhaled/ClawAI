import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import {
  COST_ENSEMBLE_TIMEOUT_MS,
  COST_TIER_THRESHOLD_DUO,
  COST_TIER_THRESHOLD_TRIO,
  DEFAULT_COST_ENSEMBLE_MODEL,
} from '../constants/cost-ensemble.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import { QualityCheckManager } from './quality-check.manager';
import type { CostEnsembleMessageDto } from '../dto/cost-ensemble-message.dto';
import type {
  CostClassification,
  CostEnsembleResponse,
  CostTier,
  EnsembleCandidate,
  RawClassification,
} from '../types/cost-ensemble.types';
import type { OllamaGenerateRequest, OllamaGenerateResponse } from '../types/execution.types';
import { RoutingMode } from '../../../generated/prisma';

@Injectable()
export class CostEnsembleManager {
  private readonly logger = new Logger(CostEnsembleManager.name);

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
    private readonly qualityCheckManager: QualityCheckManager,
    private readonly localModelSelection?: LocalModelSelectionService,
  ) {}

  async executeCostEnsemble(
    userId: string,
    dto: CostEnsembleMessageDto,
  ): Promise<CostEnsembleResponse> {
    this.logger.log(`executeCostEnsemble: starting for user ${userId}`);

    const threadId = await this.resolveThreadId(userId, dto);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: dto.content,
      metadata: { costEnsembleRequest: true },
    });

    void this.executeInBackground(threadId, dto.content);

    return { messageId: userMessage.id, threadId };
  }

  async executeInBackground(threadId: string, content: string): Promise<void> {
    try {
      const rawClassification = await this.classifyTask(content);
      const tier = this.determineTier(rawClassification);
      const classification: CostClassification = { tier, ...rawClassification };

      const candidates = await this.runEnsemble(content, tier);
      const { selectedIndex, best } = this.selectBest(candidates, content);

      await this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: best,
        provider: 'local-ollama',
        model: await this.resolveModel(),
        latencyMs: candidates[selectedIndex]?.latencyMs ?? 0,
        usedFallback: false,
        routingMode: RoutingMode.AUTO,
        metadata: {
          costEnsemble: true,
          tier,
          classification,
          candidates,
          selectedIndex,
        },
      });

      this.chatStreamService.emitCompletion(threadId, 'local-ollama', await this.resolveModel());
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Cost ensemble generation failed';
      this.logger.error(`executeInBackground: failed for thread ${threadId} — ${errorMsg}`);
      this.chatStreamService.emitError(threadId, errorMsg);
      try {
        await this.storeErrorMessage(threadId, errorMsg);
      } catch (storeError: unknown) {
        const storeMsg = storeError instanceof Error ? storeError.message : 'Store failed';
        this.logger.error(`executeInBackground: failed to store error message — ${storeMsg}`);
      }
    }
  }

  private async classifyTask(content: string): Promise<RawClassification> {
    const config = AppConfig.get();
    const classifyPrompt = [
      'You are a task complexity classifier. Analyze the following task and return ONLY a valid JSON object.',
      'The JSON must have exactly these fields: complexity (0.0-1.0), risk (0.0-1.0), ambiguity (0.0-1.0), reasoning (string).',
      'complexity: how computationally or intellectually demanding is this task?',
      'risk: how severe are the consequences of an incorrect answer?',
      'ambiguity: how unclear or open-ended is the task?',
      'Return ONLY JSON, no markdown, no code blocks.',
      '',
      `Task: ${content}`,
    ].join('\n');

    const requestBody: OllamaGenerateRequest = {
      model: DEFAULT_COST_ENSEMBLE_MODEL,
      prompt: classifyPrompt,
      stream: false,
    };

    try {
      const response = await httpRequest<OllamaGenerateResponse>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
        method: 'POST',
        body: requestBody,
        timeoutMs: COST_ENSEMBLE_TIMEOUT_MS,
      });

      if (!response.ok) {
        return this.defaultClassification();
      }

      const raw = response.data.response.trim();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const complexity = typeof parsed['complexity'] === 'number' ? parsed['complexity'] : 0.3;
      const risk = typeof parsed['risk'] === 'number' ? parsed['risk'] : 0.2;
      const ambiguity = typeof parsed['ambiguity'] === 'number' ? parsed['ambiguity'] : 0.2;
      const reasoning =
        typeof parsed['reasoning'] === 'string' ? parsed['reasoning'] : 'Classification complete';

      return { complexity, risk, ambiguity, reasoning };
    } catch {
      return this.defaultClassification();
    }
  }

  private determineTier(raw: RawClassification): CostTier {
    const avgScore = (raw.complexity + raw.risk + raw.ambiguity) / 3;
    if (avgScore >= COST_TIER_THRESHOLD_TRIO) {
      return 'trio';
    }
    if (avgScore >= COST_TIER_THRESHOLD_DUO) {
      return 'duo';
    }
    return 'single';
  }

  private tierToCount(tier: CostTier): number {
    if (tier === 'trio') {
      return 3;
    }
    if (tier === 'duo') {
      return 2;
    }
    return 1;
  }

  private async runEnsemble(content: string, tier: CostTier): Promise<EnsembleCandidate[]> {
    const count = this.tierToCount(tier);
    const config = AppConfig.get();
    const model = await this.resolveModel();

    const calls = Array.from({ length: count }, () =>
      this.runOneCall(config.OLLAMA_SERVICE_URL, content, model),
    );

    const results = await Promise.allSettled(calls);
    const candidates: EnsembleCandidate[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        candidates.push(result.value);
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : 'Call failed';
        this.logger.warn(`runEnsemble: one call failed — ${msg}`);
      }
    }

    return candidates;
  }

  private async runOneCall(
    ollamaServiceUrl: string,
    content: string,
    model: string,
  ): Promise<EnsembleCandidate> {
    const start = Date.now();
    const requestBody: OllamaGenerateRequest = {
      model,
      prompt: content,
      stream: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${ollamaServiceUrl}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: COST_ENSEMBLE_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${String(response.status)}`);
    }

    return {
      model,
      response: response.data.response.trim(),
      latencyMs: Date.now() - start,
    };
  }

  private selectBest(
    candidates: EnsembleCandidate[],
    content: string,
  ): { selectedIndex: number; best: string } {
    if (candidates.length === 0) {
      throw new Error('No ensemble candidates produced a result');
    }

    let bestIndex = 0;
    let bestScore = -1;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (!candidate) {
        continue;
      }
      const result = this.qualityCheckManager.checkResponseQuality(candidate.response, content);
      if (result.score > bestScore) {
        bestScore = result.score;
        bestIndex = i;
      }
    }

    const bestCandidate = candidates[bestIndex];
    if (!bestCandidate) {
      throw new Error('Failed to select best candidate');
    }

    return { selectedIndex: bestIndex, best: bestCandidate.response };
  }

  private async resolveThreadId(userId: string, dto: CostEnsembleMessageDto): Promise<string> {
    if (dto.threadId && dto.threadId.length > 0) {
      return dto.threadId;
    }
    const thread = await this.chatThreadsRepository.create({
      userId,
      title: `Cost Ensemble: ${dto.content.slice(0, 50)}`,
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
      model: await this.resolveModel(),
      routingMode: RoutingMode.AUTO,
      usedFallback: true,
      metadata: { error: true },
    });
  }

  private async resolveModel(): Promise<string> {
    if (DEFAULT_COST_ENSEMBLE_MODEL !== 'AUTO') {
      return DEFAULT_COST_ENSEMBLE_MODEL;
    }
    return this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
  }

  private defaultClassification(): RawClassification {
    return {
      complexity: 0.3,
      risk: 0.2,
      ambiguity: 0.2,
      reasoning: 'Classification unavailable',
    };
  }
}
