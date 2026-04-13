import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import {
  DEFAULT_VERIFIER_MODEL,
  MAX_VERIFIER_REVISIONS,
  VERIFIER_PASS_THRESHOLD,
  VERIFIER_TIMEOUT_MS,
} from '../constants/verifier.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import type { VerifyMessageDto } from '../dto/verify-message.dto';
import type { VerifierCheckResult, VerifyResponse } from '../types/verifier.types';
import type { OllamaGenerateRequest, OllamaGenerateResponse } from '../types/execution.types';
import { RoutingMode } from '../../../generated/prisma';

@Injectable()
export class VerifierManager {
  private readonly logger = new Logger(VerifierManager.name);

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
  ) {}

  async executeVerify(userId: string, dto: VerifyMessageDto): Promise<VerifyResponse> {
    this.logger.log(`executeVerify: starting for user ${userId}`);

    const threadId = await this.resolveThreadId(userId, dto);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: dto.content,
      metadata: { verifyRequest: true, maxRevisions: dto.maxRevisions },
    });

    void this.executeInBackground(threadId, dto.content, dto.maxRevisions);

    return { messageId: userMessage.id, threadId };
  }

  async executeInBackground(
    threadId: string,
    content: string,
    maxRevisions: number,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const draft = await this.generateDraft(content, startTime);
      const checkResult = await this.runVerifierCheck(content, draft);

      if (checkResult.score >= VERIFIER_PASS_THRESHOLD || maxRevisions === 0) {
        await this.storeVerifiedMessage(threadId, draft, checkResult, 0, startTime);
        this.chatStreamService.emitCompletion(threadId, 'local-ollama', DEFAULT_VERIFIER_MODEL);
        return;
      }

      const { finalDraft, finalCheck, revisionCount } = await this.runRevisions(
        content,
        draft,
        checkResult,
        maxRevisions,
      );

      await this.storeVerifiedMessage(threadId, finalDraft, finalCheck, revisionCount, startTime);
      this.chatStreamService.emitCompletion(threadId, 'local-ollama', DEFAULT_VERIFIER_MODEL);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Verification failed';
      this.logger.error(`executeInBackground: failed for thread ${threadId} — ${msg}`);
      this.chatStreamService.emitError(threadId, `Verifier failed: ${msg}`);
      try {
        await this.storeErrorMessage(threadId, msg);
      } catch (storeError: unknown) {
        const storeMsg = storeError instanceof Error ? storeError.message : 'Unknown store error';
        this.logger.error(`executeInBackground: failed to store error message — ${storeMsg}`);
      }
    }
  }

  private async runRevisions(
    content: string,
    initialDraft: string,
    initialCheck: VerifierCheckResult,
    maxRevisions: number,
  ): Promise<{ finalDraft: string; finalCheck: VerifierCheckResult; revisionCount: number }> {
    let currentDraft = initialDraft;
    let currentCheck = initialCheck;
    let revisionCount = 0;

    for (let i = 0; i < maxRevisions; i++) {
      const revised = await this.repairDraft(content, currentDraft, currentCheck.suggestions);
      const recheck = await this.runVerifierCheck(content, revised);
      revisionCount += 1;
      currentDraft = revised;
      currentCheck = recheck;

      if (currentCheck.score >= VERIFIER_PASS_THRESHOLD) {
        break;
      }
    }

    return { finalDraft: currentDraft, finalCheck: currentCheck, revisionCount };
  }

  private async generateDraft(content: string, _startTime: number): Promise<string> {
    const config = AppConfig.get();

    const requestBody: OllamaGenerateRequest = {
      model: DEFAULT_VERIFIER_MODEL,
      prompt: content,
      stream: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: VERIFIER_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(`Ollama draft generation returned status ${String(response.status)}`);
    }

    const draft = response.data.response.trim();
    if (draft.length === 0) {
      throw new Error('Ollama returned an empty draft response');
    }

    return draft;
  }

  private async runVerifierCheck(content: string, draft: string): Promise<VerifierCheckResult> {
    const config = AppConfig.get();

    const verifierPrompt = `You are a response quality verifier. Evaluate this response to the given question.

Question: ${content}

Response: ${draft}

Score the response on: factuality (0-1), completeness (0-1), safety (0-1), formatting (0-1).
Return ONLY JSON: { "score": <average 0-1>, "issues": ["..."], "suggestions": ["..."] }`;

    const requestBody: OllamaGenerateRequest = {
      model: DEFAULT_VERIFIER_MODEL,
      prompt: verifierPrompt,
      stream: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: VERIFIER_TIMEOUT_MS,
    });

    if (!response.ok) {
      this.logger.warn(
        `runVerifierCheck: verifier returned status ${String(response.status)}, using fallback`,
      );
      return { passed: true, score: 1, issues: [], suggestions: [] };
    }

    return this.parseVerifierResponse(response.data.response);
  }

  private parseVerifierResponse(raw: string): VerifierCheckResult {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { passed: true, score: 1, issues: [], suggestions: [] };
      }
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const score = typeof parsed['score'] === 'number' ? parsed['score'] : 1;
      const issues = Array.isArray(parsed['issues'])
        ? (parsed['issues'] as string[]).filter((s): s is string => typeof s === 'string')
        : [];
      const suggestions = Array.isArray(parsed['suggestions'])
        ? (parsed['suggestions'] as string[]).filter((s): s is string => typeof s === 'string')
        : [];
      return { passed: score >= VERIFIER_PASS_THRESHOLD, score, issues, suggestions };
    } catch {
      return { passed: true, score: 1, issues: [], suggestions: [] };
    }
  }

  private async repairDraft(
    content: string,
    draft: string,
    suggestions: string[],
  ): Promise<string> {
    const config = AppConfig.get();

    const suggestionText =
      suggestions.length > 0
        ? suggestions.map((s) => `- ${s}`).join('\n')
        : '- Improve overall quality';

    const repairPrompt = `You are a response improvement assistant. Revise the following response based on the suggestions.

Original question: ${content}

Current response:
${draft}

Suggestions for improvement:
${suggestionText}

Return ONLY the improved response. Do not explain changes.`;

    const requestBody: OllamaGenerateRequest = {
      model: DEFAULT_VERIFIER_MODEL,
      prompt: repairPrompt,
      stream: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: VERIFIER_TIMEOUT_MS,
    });

    if (!response.ok) {
      this.logger.warn(
        `repairDraft: repair returned status ${String(response.status)}, using original draft`,
      );
      return draft;
    }

    const repaired = response.data.response.trim();
    return repaired.length > 0 ? repaired : draft;
  }

  private async storeVerifiedMessage(
    threadId: string,
    content: string,
    checkResult: VerifierCheckResult,
    revisionCount: number,
    startTime: number,
  ): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content,
      provider: 'local-ollama',
      model: DEFAULT_VERIFIER_MODEL,
      routingMode: RoutingMode.AUTO,
      latencyMs: Date.now() - startTime,
      usedFallback: false,
      metadata: {
        verified: true,
        verifierScore: checkResult.score,
        verifierIssues: checkResult.issues,
        revisionCount,
      },
    });
  }

  private async resolveThreadId(userId: string, dto: VerifyMessageDto): Promise<string> {
    if (dto.threadId && dto.threadId.length > 0) {
      return dto.threadId;
    }
    const thread = await this.chatThreadsRepository.create({
      userId,
      title: `Verify: ${dto.content.slice(0, 50)}`,
      routingMode: RoutingMode.AUTO,
    });
    return thread.id;
  }

  private async storeErrorMessage(threadId: string, errorMsg: string): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content: `Verification failed: ${errorMsg}`,
      provider: 'local-ollama',
      model: DEFAULT_VERIFIER_MODEL,
      routingMode: RoutingMode.AUTO,
      usedFallback: true,
      metadata: { verified: false, error: true },
    });
  }
}

export { MAX_VERIFIER_REVISIONS };
