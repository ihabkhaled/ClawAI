import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import {
  DEFAULT_VERIFIER_MODEL,
  MAX_VERIFIER_REVISIONS,
  VERIFIER_PASS_THRESHOLD,
  VERIFIER_TIMEOUT_MS,
} from '../constants/verifier.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { AccessControlService } from '../services/access-control.service';
import { ChatStreamService } from '../services/chat-stream.service';
import { AdvancedModuleModelSelectionService } from '../services/advanced-module-model-selection.service';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import { ResearchEnricherManager } from './research-enricher.manager';
import { prependResearchEvidence } from '../utilities/research-prompt.utility';
import type { ResearchTranscript } from '../types/research-transcript.types';
import type { VerifyMessageDto } from '../dto/verify-message.dto';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
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
    private readonly researchEnricherManager: ResearchEnricherManager,
    private readonly accessControlService: AccessControlService,
    private readonly advancedModelSelectionService?: AdvancedModuleModelSelectionService,
    private readonly localModelSelection?: LocalModelSelectionService,
  ) {}

  async executeVerify(
    userId: string,
    dto: VerifyMessageDto,
    userToken: string,
  ): Promise<VerifyResponse> {
    this.logger.log(`executeVerify: starting for user ${userId}`);

    const threadId = await this.resolveThreadId(userId, dto);
    const selection = await this.resolveSelection(dto);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: dto.content,
      metadata: { verifyRequest: true, maxRevisions: dto.maxRevisions, modelSelection: selection },
    });

    void this.executeInBackground(
      threadId,
      dto.content,
      dto.maxRevisions,
      userId,
      selection,
      dto.researchMode,
      dto.researchProviderId,
      userToken,
    );

    return { messageId: userMessage.id, threadId };
  }

  async executeInBackground(
    threadId: string,
    content: string,
    maxRevisions: number,
    userId: string,
    selection?: AdvancedModelSelectionResolution,
    researchMode?: ResearchMode,
    researchProviderId?: string,
    userToken?: string,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const resolvedSelection = selection ?? (await this.buildAutoSelection());
      // Enrich ONCE — initial draft, every verifier-check, and every repair
      // step share the same evidence so a hallucinated fact in the draft can
      // be repaired against the same web sources.
      const enrichment = await this.researchEnricherManager.enrichForOrchestration({
        threadId,
        mode: researchMode,
        query: content,
        userToken: userToken ?? '',
        providerId: researchProviderId,
      });
      const draft = await this.generateDraft(
        content,
        resolvedSelection,
        enrichment.systemPrompt,
        userId,
      );
      const checkResult = await this.runVerifierCheck(content, draft, resolvedSelection, userId);

      if (checkResult.score >= VERIFIER_PASS_THRESHOLD || maxRevisions === 0) {
        await this.storeVerifiedMessage(
          threadId,
          draft,
          checkResult,
          0,
          startTime,
          resolvedSelection,
          enrichment.transcript,
        );
        this.chatStreamService.emitCompletion(
          threadId,
          resolvedSelection.actualProvider,
          resolvedSelection.actualModel,
        );
        return;
      }

      const { finalDraft, finalCheck, revisionCount } = await this.runRevisions(
        content,
        draft,
        checkResult,
        maxRevisions,
        resolvedSelection,
        enrichment.systemPrompt,
        userId,
      );

      await this.storeVerifiedMessage(
        threadId,
        finalDraft,
        finalCheck,
        revisionCount,
        startTime,
        resolvedSelection,
        enrichment.transcript,
      );
      this.chatStreamService.emitCompletion(
        threadId,
        resolvedSelection.actualProvider,
        resolvedSelection.actualModel,
      );
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
    selection: AdvancedModelSelectionResolution,
    researchEvidence: string,
    userId: string,
  ): Promise<{ finalDraft: string; finalCheck: VerifierCheckResult; revisionCount: number }> {
    let currentDraft = initialDraft;
    let currentCheck = initialCheck;
    let revisionCount = 0;

    for (let i = 0; i < maxRevisions; i++) {
      const revised = await this.repairDraft(
        content,
        currentDraft,
        currentCheck.suggestions,
        selection,
        researchEvidence,
        userId,
      );
      const recheck = await this.runVerifierCheck(content, revised, selection, userId);
      revisionCount += 1;
      currentDraft = revised;
      currentCheck = recheck;

      if (currentCheck.score >= VERIFIER_PASS_THRESHOLD) {
        break;
      }
    }

    return { finalDraft: currentDraft, finalCheck: currentCheck, revisionCount };
  }

  private async generateDraft(
    content: string,
    selection: AdvancedModelSelectionResolution,
    researchEvidence: string,
    userId: string,
  ): Promise<string> {
    const config = AppConfig.get();
    const model = selection.actualModel;

    const requestBody: OllamaGenerateRequest = {
      model,
      prompt: prependResearchEvidence(content, researchEvidence),
      stream: false,
      think: false,
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

    // Universal token deduction: draft hop.
    void this.accessControlService.recordUsage({
      userId,
      planId: null,
      inputTokens: response.data.promptEvalCount ?? 0,
      outputTokens: response.data.evalCount ?? 0,
      provider: 'local-ollama',
      model,
    });

    const draft = response.data.response.trim();
    if (draft.length === 0) {
      throw new Error('Ollama returned an empty draft response');
    }

    return draft;
  }

  private async runVerifierCheck(
    content: string,
    draft: string,
    selection: AdvancedModelSelectionResolution,
    userId: string,
  ): Promise<VerifierCheckResult> {
    const config = AppConfig.get();
    const model = selection.actualModel;

    const verifierPrompt = `You are a response quality verifier. Evaluate this response to the given question.

Question: ${content}

Response: ${draft}

Score the response on: factuality (0-1), completeness (0-1), safety (0-1), formatting (0-1).
Return ONLY JSON: { "score": <average 0-1>, "issues": ["..."], "suggestions": ["..."] }`;

    const requestBody: OllamaGenerateRequest = {
      model,
      prompt: verifierPrompt,
      stream: false,
      think: false,
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

    // Universal token deduction: verifier-check hop.
    void this.accessControlService.recordUsage({
      userId,
      planId: null,
      inputTokens: response.data.promptEvalCount ?? 0,
      outputTokens: response.data.evalCount ?? 0,
      provider: 'local-ollama',
      model,
    });

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
    selection: AdvancedModelSelectionResolution,
    researchEvidence: string,
    userId: string,
  ): Promise<string> {
    const config = AppConfig.get();
    const model = selection.actualModel;

    const suggestionText =
      suggestions.length > 0
        ? suggestions.map((s) => `- ${s}`).join('\n')
        : '- Improve overall quality';

    const baseRepairPrompt = `You are a response improvement assistant. Revise the following response based on the suggestions.

Original question: ${content}

Current response:
${draft}

Suggestions for improvement:
${suggestionText}

Return ONLY the improved response. Do not explain changes.`;
    const repairPrompt = prependResearchEvidence(baseRepairPrompt, researchEvidence);

    const requestBody: OllamaGenerateRequest = {
      model,
      prompt: repairPrompt,
      stream: false,
      think: false,
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

    // Universal token deduction: repair hop.
    void this.accessControlService.recordUsage({
      userId,
      planId: null,
      inputTokens: response.data.promptEvalCount ?? 0,
      outputTokens: response.data.evalCount ?? 0,
      provider: 'local-ollama',
      model,
    });

    const repaired = response.data.response.trim();
    return repaired.length > 0 ? repaired : draft;
  }

  private async storeVerifiedMessage(
    threadId: string,
    content: string,
    checkResult: VerifierCheckResult,
    revisionCount: number,
    startTime: number,
    selection: AdvancedModelSelectionResolution,
    researchTranscript: ResearchTranscript | null,
  ): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content,
      provider: selection.actualProvider,
      model: selection.actualModel,
      routingMode:
        selection.modelSelectionMode === 'MANUAL_MODEL'
          ? RoutingMode.MANUAL_MODEL
          : RoutingMode.AUTO,
      latencyMs: Date.now() - startTime,
      usedFallback: false,
      metadata: {
        verified: true,
        verifierScore: checkResult.score,
        verifierIssues: checkResult.issues,
        revisionCount,
        modelSelection: selection,
        ...(researchTranscript === null ? {} : { researchTranscript }),
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
      model: await this.resolveModel(DEFAULT_VERIFIER_MODEL),
      routingMode: RoutingMode.AUTO,
      usedFallback: true,
      metadata: { verified: false, error: true },
    });
  }

  private async resolveModel(model: string): Promise<string> {
    if (model !== 'AUTO') {
      return model;
    }
    if (DEFAULT_VERIFIER_MODEL !== 'AUTO') {
      return DEFAULT_VERIFIER_MODEL;
    }
    return this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
  }

  private async resolveSelection(dto: VerifyMessageDto): Promise<AdvancedModelSelectionResolution> {
    if (this.advancedModelSelectionService) {
      return this.advancedModelSelectionService.resolveSelection(
        {
          modelSelectionMode: dto.modelSelectionMode,
          requestedProvider: dto.requestedProvider,
          requestedModel: dto.requestedModel,
          requestedDisplayName: dto.requestedDisplayName,
          selectedModelSource: dto.selectedModelSource,
        },
        await this.resolveModel(DEFAULT_VERIFIER_MODEL),
      );
    }

    return this.buildAutoSelection({
      requestedProvider: dto.requestedProvider ?? null,
      requestedModel: dto.requestedModel ?? null,
      requestedDisplayName: dto.requestedDisplayName,
      selectedModelSource: dto.selectedModelSource ?? null,
    });
  }

  private async buildAutoSelection(
    overrides?: Partial<AdvancedModelSelectionResolution>,
  ): Promise<AdvancedModelSelectionResolution> {
    const actualModel =
      overrides?.requestedModel ?? (await this.resolveModel(DEFAULT_VERIFIER_MODEL));
    return {
      modelSelectionMode: overrides?.requestedModel
        ? ModelSelectionMode.MANUAL_MODEL
        : ModelSelectionMode.AUTO,
      requestedProvider: overrides?.requestedProvider ?? null,
      requestedModel: overrides?.requestedModel ?? null,
      requestedDisplayName: overrides?.requestedDisplayName ?? null,
      selectedModelSource: overrides?.selectedModelSource ?? null,
      actualProvider: 'local-ollama',
      actualModel,
    };
  }
}

export { MAX_VERIFIER_REVISIONS };
