import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import { OrchestrationStageStatus } from '../../../common/enums/orchestration-stage-status.enum';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { DEFAULT_CANDIDATE_MODEL } from '../constants/best-of-n.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import { AdvancedModuleModelSelectionService } from '../services/advanced-module-model-selection.service';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import { ChatContextGatewayManager } from './chat-context-gateway.manager';
import { ModeExecutionGatewayManager } from './mode-execution-gateway.manager';
import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import { MODE_HISTORY_MESSAGE_LIMIT } from '../constants/chat-context-gateway.constants';
import { parseJudgeModel } from '../../../common/utilities/judge-model-parse.utility';
import { TokenLedgerContext } from '@claw/shared-types';
import { QualityCheckManager } from './quality-check.manager';
import { ResearchEnricherManager } from './research-enricher.manager';
import type { BestOfNMessageDto } from '../dto/best-of-n-message.dto';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
import type { BestOfNResponse, CandidateResult } from '../types/best-of-n.types';
import type { ChatContextBundle } from '../types/chat-context-gateway.types';
import { RoutingMode } from '../../../generated/prisma';
import { OLLAMA_PROVIDER } from '../../../common/constants';
import { PAYG_WORKFLOW_BEST_OF_N } from '../constants/payg.constants';

/**
 * Generates N candidate answers and picks the best via quality scoring.
 *
 * Model selection semantics:
 * - AUTO: N candidates may use a mixed model set. LocalModelSelectionService resolves
 *   an execution plan from the installed-model inventory; diversity across candidates
 *   is intentional to surface the best-scoring response.
 * - MANUAL_MODEL: ALL N candidates run with the single user-selected model. Diversity
 *   comes from sampling variance (temperature, seed). If the requested model is
 *   unsupported or unavailable, AdvancedModuleModelSelectionService throws
 *   BusinessException before any candidate runs.
 * - If `dto.models` is explicitly provided, it overrides auto candidate assignment
 *   but NOT the user's manual selection (manual wins).
 */
@Injectable()
export class BestOfNManager {
  private readonly logger = new Logger(BestOfNManager.name);

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
    private readonly qualityCheckManager: QualityCheckManager,
    private readonly chatContextGateway: ChatContextGatewayManager,
    private readonly modeExecutionGateway: ModeExecutionGatewayManager,
    private readonly researchEnricherManager: ResearchEnricherManager,
    private readonly advancedModelSelectionService?: AdvancedModuleModelSelectionService,
    private readonly localModelSelection?: LocalModelSelectionService,
  ) {}

  async executeBestOfN(
    userId: string,
    dto: BestOfNMessageDto,
    userToken: string,
  ): Promise<BestOfNResponse> {
    this.logger.log(`executeBestOfN: starting for user ${userId}, n=${String(dto.n)}`);

    const threadId = await this.resolveThreadId(userId, dto);
    const selection = await this.resolveSelection(dto);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: dto.content,
      metadata: { bestOfNRequest: true, modelSelection: selection },
    });

    void this.executeInBackground(
      threadId,
      dto.content,
      dto.n,
      userId,
      selection,
      dto.models,
      dto.researchMode,
      dto.researchProviderId,
      userToken,
    );

    return { messageId: userMessage.id, threadId };
  }

  async executeInBackground(
    threadId: string,
    content: string,
    n: number,
    userId: string,
    selectionOrModels?: AdvancedModelSelectionResolution | string[],
    models?: string[],
    researchMode?: ResearchMode,
    researchProviderId?: string,
    userToken?: string,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const isLegacyModels = Array.isArray(selectionOrModels);
      const resolvedSelection = isLegacyModels
        ? await this.buildAutoSelection()
        : (selectionOrModels ?? (await this.buildAutoSelection()));
      const candidateModels = this.buildCandidateModels(
        n,
        resolvedSelection,
        isLegacyModels ? selectionOrModels : models,
      );
      // Shared enricher transcript across all N candidates.
      const enrichment = await this.researchEnricherManager.enrichForOrchestration({
        threadId,
        mode: researchMode,
        query: content,
        userToken: userToken ?? '',
        providerId: researchProviderId,
      });
      // One bundle, shared by every candidate: N candidates answering the same
      // question must see the same conversation, files and memories, and
      // building it once also means one set of retrievals rather than N.
      const bundle = await this.chatContextGateway.build({
        userId,
        threadId,
        surface: ChatSurface.BEST_OF_N,
        historyLimit: MODE_HISTORY_MESSAGE_LIMIT,
        // The enricher's transcript used to be glued to the front of the raw
        // prompt. It is an instruction about how to answer, so it belongs in
        // the system prompt beside the user's own — appended, never replacing.
        ...(enrichment.systemPrompt.length > 0
          ? { personaInstruction: enrichment.systemPrompt }
          : {}),
      });
      const candidates = await this.runCandidates(
        threadId,
        content,
        candidateModels,
        startTime,
        enrichment.systemPrompt,
        userId,
        bundle,
      );
      this.safeEmitStage(threadId, {
        label: 'Scoring',
        status: OrchestrationStageStatus.ACTIVE,
        detail: `${String(candidates.length)} candidates scored on quality`,
        stageId: 'best-of-n:scoring',
      });
      const ranked = this.rankCandidates(candidates, content);
      const best = ranked[0];

      if (!best) {
        throw new Error('No candidates produced a result');
      }
      this.safeEmitStage(threadId, {
        label: 'Scoring',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `Top score ${String(best.qualityScore.toFixed(2))}`,
        stageId: 'best-of-n:scoring',
      });
      this.safeEmitStage(threadId, {
        label: 'Selecting winner',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `${best.model} — rank 1 of ${String(ranked.length)}`,
        stageId: 'best-of-n:winner',
      });

      await this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: best.content,
        provider: 'local-ollama',
        model: best.model,
        latencyMs: best.latencyMs,
        usedFallback: false,
        routingMode:
          resolvedSelection.modelSelectionMode === 'MANUAL_MODEL'
            ? RoutingMode.MANUAL_MODEL
            : RoutingMode.AUTO,
        metadata: {
          bestOfN: true,
          candidates: ranked,
          bestRank: 1,
          modelSelection: resolvedSelection,
          ...(enrichment.transcript === null ? {} : { researchTranscript: enrichment.transcript }),
        },
      });

      this.safeEmitStage(threadId, {
        label: 'Complete',
        status: OrchestrationStageStatus.COMPLETED,
        stageId: 'best-of-n:complete',
      });
      this.chatStreamService.emitCompletion(threadId, 'local-ollama', best.model);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Best-of-N generation failed';
      this.logger.error(`executeInBackground: failed for thread ${threadId} - ${errorMsg}`);
      this.safeEmitStage(threadId, {
        label: 'Best-of-N failed',
        status: OrchestrationStageStatus.ERROR,
        detail: errorMsg,
        stageId: 'best-of-n:error',
      });
      this.chatStreamService.emitError(threadId, errorMsg);
      try {
        await this.storeErrorMessage(threadId, errorMsg);
      } catch (storeError: unknown) {
        const storeMsg = storeError instanceof Error ? storeError.message : 'Store failed';
        this.logger.error(`executeInBackground: failed to store error message — ${storeMsg}`);
      }
    }
  }

  private buildCandidateModels(
    n: number,
    selection: AdvancedModelSelectionResolution,
    models?: string[],
  ): string[] {
    if (selection.modelSelectionMode === 'MANUAL_MODEL') {
      return Array.from({ length: n }, () => selection.actualModel);
    }
    if (models && models.length > 0) {
      return models;
    }
    return Array.from({ length: n }, () => DEFAULT_CANDIDATE_MODEL);
  }

  private async runCandidates(
    threadId: string,
    content: string,
    candidateModels: string[],
    startTime: number,
    researchEvidence: string,
    userId: string,
    bundle: ChatContextBundle,
  ): Promise<CandidateResult[]> {
    const resolvedModels = candidateModels.includes(DEFAULT_CANDIDATE_MODEL)
      ? ((await this.localModelSelection?.resolveModelList(candidateModels.length)) ??
        Array.from({ length: candidateModels.length }, () => 'AUTO'))
      : candidateModels;
    const total = resolvedModels.length;
    const results = await Promise.allSettled(
      resolvedModels.map((model, index) => {
        const stageId = `best-of-n:sample:${String(index + 1)}`;
        this.safeEmitStage(threadId, {
          label: `Sampling ${String(index + 1)}/${String(total)}`,
          status: OrchestrationStageStatus.ACTIVE,
          detail: model,
          stageId,
        });
        return this.runOneCandidate(
          bundle,
          model,
          content,
          startTime,
          researchEvidence,
          userId,
        ).then(
          (value) => {
            this.safeEmitStage(threadId, {
              label: `Sampling ${String(index + 1)}/${String(total)}`,
              status: OrchestrationStageStatus.COMPLETED,
              detail: `${model} — quality ${String(value.qualityScore.toFixed(2))}`,
              stageId,
            });
            return value;
          },
          (reason: unknown) => {
            const errMsg = reason instanceof Error ? reason.message : 'Candidate failed';
            this.safeEmitStage(threadId, {
              label: `Sampling ${String(index + 1)}/${String(total)}`,
              status: OrchestrationStageStatus.ERROR,
              detail: `${model} — ${errMsg}`,
              stageId,
            });
            throw reason instanceof Error ? reason : new Error(errMsg);
          },
        );
      }),
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

  private safeEmitStage(
    threadId: string,
    payload: {
      label: string;
      status: OrchestrationStageStatus;
      detail?: string;
      stageId?: string;
    },
  ): void {
    try {
      this.chatStreamService.emitOrchestrationStage(threadId, payload);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown emit error';
      this.logger.warn(`safeEmitStage: failed to emit "${payload.label}" — ${msg}`);
    }
  }

  private rankCandidates(candidates: CandidateResult[], _content: string): CandidateResult[] {
    const sorted = [...candidates].sort((a, b) => b.qualityScore - a.qualityScore);
    return sorted.map((candidate, index) => ({ ...candidate, rank: index + 1 }));
  }

  /**
   * One candidate, through the same chokepoint a chat turn uses.
   *
   * This used to post an `OllamaGenerateRequest` straight at
   * `/api/v1/ollama/generate`, which pinned every candidate to a local model —
   * an account with only a cloud connector could not run this mode at all —
   * and metered through a second, parallel accounting path. It now carries the
   * full context bundle and can name any connector the user has.
   */
  private async runOneCandidate(
    bundle: ChatContextBundle,
    model: string,
    content: string,
    _globalStartTime: number,
    _researchEvidence: string,
    _userId: string,
  ): Promise<CandidateResult> {
    const candidateStart = Date.now();
    const parsed = parseJudgeModel(model);
    const provider = parsed.provider ?? OLLAMA_PROVIDER;

    const response = await this.modeExecutionGateway.run({
      bundle,
      prompt: content,
      provider,
      model: parsed.model.length > 0 ? parsed.model : model,
      ledgerContext: TokenLedgerContext.BEST_OF_N,
      paygCall: {
        workflow: PAYG_WORKFLOW_BEST_OF_N,
        requestId: `best-of-n:candidate:${randomUUID()}`,
      },
    });

    const latencyMs = Date.now() - candidateStart;
    const responseContent = response.content ?? '';
    // Quota is no longer recorded here: `callProvider` is the universal token
    // deduction chokepoint and records every call that passes through it. The
    // hand-rolled `recordUsage` this method used to make was a second path to
    // the same ledger, which is exactly what this batch removes.
    const qualityResult = this.qualityCheckManager.checkResponseQuality(responseContent, content);

    return {
      content: responseContent,
      provider,
      model,
      latencyMs,
      qualityScore: qualityResult.score,
      qualityReasons: qualityResult.reasons,
      rank: 0,
    };
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
      model: (await this.localModelSelection?.resolveDefaultModel()) ?? 'AUTO',
      routingMode: RoutingMode.AUTO,
      usedFallback: true,
      metadata: { error: true },
    });
  }

  private async resolveSelection(
    dto: BestOfNMessageDto,
  ): Promise<AdvancedModelSelectionResolution> {
    if (this.advancedModelSelectionService) {
      return this.advancedModelSelectionService.resolveSelection(
        {
          modelSelectionMode: dto.modelSelectionMode,
          requestedProvider: dto.requestedProvider,
          requestedModel: dto.requestedModel,
          requestedDisplayName: dto.requestedDisplayName,
          selectedModelSource: dto.selectedModelSource,
        },
        (await this.localModelSelection?.resolveDefaultModel()) ?? DEFAULT_CANDIDATE_MODEL,
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
      overrides?.requestedModel ??
      (await this.localModelSelection?.resolveDefaultModel()) ??
      DEFAULT_CANDIDATE_MODEL;
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
