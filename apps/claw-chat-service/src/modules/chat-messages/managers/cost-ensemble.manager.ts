import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import { OrchestrationStageStatus } from '../../../common/enums/orchestration-stage-status.enum';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import {
  COST_TIER_THRESHOLD_DUO,
  COST_TIER_THRESHOLD_TRIO,
  DEFAULT_COST_ENSEMBLE_MODEL,
} from '../constants/cost-ensemble.constants';
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
import type { CostEnsembleMessageDto } from '../dto/cost-ensemble-message.dto';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
import type { ChatContextBundle } from '../types/chat-context-gateway.types';
import type {
  CostClassification,
  CostEnsembleResponse,
  CostTier,
  EnsembleCandidate,
  RawClassification,
} from '../types/cost-ensemble.types';
import type { ResearchTranscript } from '../types/research-transcript.types';
import { type Prisma, RoutingMode } from '../../../generated/prisma';
import { OLLAMA_PROVIDER } from '../../../common/constants';
import {
  PAYG_WORKFLOW_COST_ENSEMBLE,
  PAYG_WORKFLOW_COST_ENSEMBLE_CLASSIFY,
} from '../constants/payg.constants';

/**
 * Classifies the request (complexity/risk/ambiguity), picks an ensemble tier
 * (single / duo / trio), runs the tier in parallel, and returns the best candidate.
 *
 * Model selection semantics:
 * - AUTO: tier is decided by task classification; candidates are drawn from the
 *   installed-model inventory according to tier.
 * - MANUAL_MODEL: the ensemble still scales by tier, but every candidate runs with
 *   the single user-selected model (diversity comes from sampling variance, not
 *   model diversity). Cost-aware tier logic is preserved; user's model choice is
 *   honored without silent fallback.
 * - Validation: if the requested model is unsupported or unavailable,
 *   AdvancedModuleModelSelectionService throws BusinessException before the
 *   ensemble runs.
 */
@Injectable()
export class CostEnsembleManager {
  private readonly logger = new Logger(CostEnsembleManager.name);

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

  async executeCostEnsemble(
    userId: string,
    dto: CostEnsembleMessageDto,
    userToken: string,
  ): Promise<CostEnsembleResponse> {
    this.logger.log(`executeCostEnsemble: starting for user ${userId}`);

    const threadId = await this.resolveThreadId(userId, dto);
    const selection = await this.resolveSelection(dto);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: dto.content,
      metadata: { costEnsembleRequest: true, modelSelection: selection },
    });

    void this.executeInBackground(
      threadId,
      dto.content,
      userId,
      selection,
      dto.researchMode,
      dto.researchProviderId,
      userToken,
      dto.fileIds,
    );

    return { messageId: userMessage.id, threadId };
  }

  async executeInBackground(
    threadId: string,
    content: string,
    userId: string,
    selection?: AdvancedModelSelectionResolution,
    researchMode?: ResearchMode,
    researchProviderId?: string,
    userToken?: string,
    fileIds?: string[],
  ): Promise<void> {
    try {
      const resolvedSelection = selection ?? (await this.buildAutoSelection());
      // Enrich ONCE — the classifier and every ensemble candidate work from the
      // same evidence.
      const enrichment = await this.researchEnricherManager.enrichForOrchestration({
        threadId,
        mode: researchMode,
        query: content,
        userToken: userToken ?? '',
        providerId: researchProviderId,
      });
      // One bundle, built before the fan-out and shared by the classifier and
      // every candidate. The ensemble used to send the user's raw string to a
      // model with no history, no attachments, no memories and no system
      // prompt, so an ensemble answer could not be about a file the user had
      // just uploaded. Building it once also means one set of retrievals, not
      // one per tier member.
      const bundle = await this.chatContextGateway.build({
        userId,
        threadId,
        surface: ChatSurface.COST_ENSEMBLE,
        historyLimit: MODE_HISTORY_MESSAGE_LIMIT,
        // The enricher's transcript used to be glued to the front of each
        // candidate's raw prompt. It is an instruction about how to answer, so
        // it belongs in the system prompt beside the user's own — appended,
        // never replacing.
        ...(enrichment.systemPrompt.length > 0
          ? { personaInstruction: enrichment.systemPrompt }
          : {}),
        ...(fileIds !== undefined && fileIds.length > 0 ? { fileIds } : {}),
      });
      this.safeEmitStage(threadId, {
        label: 'Classifying task',
        status: OrchestrationStageStatus.ACTIVE,
        detail: 'Scoring complexity, risk, ambiguity',
        stageId: 'cost-ensemble:classify',
      });
      const rawClassification = await this.classifyTask(bundle, content, resolvedSelection);
      const tier = this.determineTier(rawClassification);
      const classification: CostClassification = { tier, ...rawClassification };
      this.safeEmitStage(threadId, {
        label: 'Classifying task',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `Tier: ${tier} (complexity ${String(rawClassification.complexity.toFixed(2))})`,
        stageId: 'cost-ensemble:classify',
      });

      const candidates = await this.runEnsemble(threadId, bundle, content, tier, resolvedSelection);
      this.safeEmitStage(threadId, {
        label: 'Cost selection',
        status: OrchestrationStageStatus.ACTIVE,
        detail: `Picking best of ${String(candidates.length)} candidate(s)`,
        stageId: 'cost-ensemble:select',
      });
      const { selectedIndex, best } = this.selectBest(candidates, content);
      this.safeEmitStage(threadId, {
        label: 'Cost selection',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `Selected candidate ${String(selectedIndex + 1)}`,
        stageId: 'cost-ensemble:select',
      });

      await this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: best,
        provider: resolvedSelection.actualProvider,
        model: resolvedSelection.actualModel,
        latencyMs: candidates.at(selectedIndex)?.latencyMs ?? 0,
        usedFallback: false,
        routingMode:
          resolvedSelection.modelSelectionMode === 'MANUAL_MODEL'
            ? RoutingMode.MANUAL_MODEL
            : RoutingMode.AUTO,
        metadata: this.buildCostEnsembleMetadata(
          resolvedSelection,
          tier,
          classification,
          candidates,
          selectedIndex,
          enrichment.transcript,
        ) as Prisma.InputJsonValue,
      });

      this.safeEmitStage(threadId, {
        label: 'Complete',
        status: OrchestrationStageStatus.COMPLETED,
        stageId: 'cost-ensemble:complete',
      });
      this.chatStreamService.emitCompletion(
        threadId,
        resolvedSelection.actualProvider,
        resolvedSelection.actualModel,
      );
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Cost ensemble generation failed';
      this.logger.error(`executeInBackground: failed for thread ${threadId} — ${errorMsg}`);
      this.safeEmitStage(threadId, {
        label: 'Cost ensemble failed',
        status: OrchestrationStageStatus.ERROR,
        detail: errorMsg,
        stageId: 'cost-ensemble:error',
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

  private buildCostEnsembleMetadata(
    resolvedSelection: AdvancedModelSelectionResolution,
    tier: CostTier,
    classification: CostClassification,
    candidates: EnsembleCandidate[],
    selectedIndex: number,
    researchTranscript: ResearchTranscript | null,
  ): Record<string, unknown> {
    return {
      costEnsemble: true,
      tier,
      classification,
      candidates,
      selectedIndex,
      modelSelection: resolvedSelection,
      ...(researchTranscript === null ? {} : { researchTranscript }),
      routeRoadmap: {
        routingMode: resolvedSelection.modelSelectionMode,
        routerModel: null,
        selectedProvider: resolvedSelection.requestedProvider ?? resolvedSelection.actualProvider,
        selectedModel: resolvedSelection.requestedModel ?? resolvedSelection.actualModel,
        finalProvider: resolvedSelection.actualProvider,
        finalModel: resolvedSelection.actualModel,
        finalDisplayName: resolvedSelection.actualModel,
        steps: [
          {
            stage: 'tool',
            provider: 'cost-ensemble',
            model: tier,
            displayName: `Cost-aware ${tier} ensemble`,
            description: `${String(candidates.length)} candidates evaluated; winner index=${String(selectedIndex)}`,
          },
          {
            stage: 'execution',
            provider: resolvedSelection.actualProvider,
            model: resolvedSelection.actualModel,
            displayName: resolvedSelection.actualModel,
          },
        ],
      },
    };
  }

  /**
   * The classifier hop, through the same chokepoint a chat turn uses.
   *
   * This used to post an `OllamaGenerateRequest` straight at
   * `/api/v1/ollama/generate`, which pinned the tier decision to a local
   * model — an account with only a cloud connector classified nothing and fell
   * back to the default every time — and metered it through a second, parallel
   * accounting path on top of a hand-rolled `recordUsage`.
   */
  private async classifyTask(
    bundle: ChatContextBundle,
    content: string,
    selection: AdvancedModelSelectionResolution,
  ): Promise<RawClassification> {
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

    const parsedModel = parseJudgeModel(selection.actualModel);
    const provider = parsedModel.provider ?? OLLAMA_PROVIDER;

    try {
      const response = await this.modeExecutionGateway.run({
        bundle,
        prompt: classifyPrompt,
        provider,
        model: parsedModel.model.length > 0 ? parsedModel.model : selection.actualModel,
        ledgerContext: TokenLedgerContext.COST_ENSEMBLE,
        paygCall: {
          workflow: PAYG_WORKFLOW_COST_ENSEMBLE_CLASSIFY,
          requestId: `cost-ensemble:classify:${randomUUID()}`,
        },
      });

      // Quota is no longer recorded here: `callProvider` is the universal token
      // deduction chokepoint and records every call that passes through it. The
      // hand-rolled `recordUsage` this method used to make was a second path to
      // the same ledger, which is exactly what this batch removes.
      const raw = (response.content ?? '').trim();
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

  private async runEnsemble(
    threadId: string,
    bundle: ChatContextBundle,
    content: string,
    tier: CostTier,
    selection: AdvancedModelSelectionResolution,
  ): Promise<EnsembleCandidate[]> {
    const count = this.tierToCount(tier);
    const model = selection.actualModel;

    const calls = Array.from({ length: count }, (_unused, index) => {
      const stageId = `cost-ensemble:provider:${String(index + 1)}`;
      this.safeEmitStage(threadId, {
        label: `Provider ${String(index + 1)}/${String(count)} dispatched`,
        status: OrchestrationStageStatus.ACTIVE,
        detail: model,
        stageId,
      });
      return this.runOneCall(bundle, content, model).then(
        (value) => {
          this.safeEmitStage(threadId, {
            label: `Provider ${String(index + 1)}/${String(count)} returned`,
            status: OrchestrationStageStatus.COMPLETED,
            detail: `${model} — ${String(value.latencyMs)}ms`,
            stageId,
          });
          return value;
        },
        (reason: unknown) => {
          const errMsg = reason instanceof Error ? reason.message : 'Call failed';
          this.safeEmitStage(threadId, {
            label: `Provider ${String(index + 1)}/${String(count)} returned`,
            status: OrchestrationStageStatus.ERROR,
            detail: `${model} — ${errMsg}`,
            stageId,
          });
          throw reason instanceof Error ? reason : new Error(errMsg);
        },
      );
    });

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

  /**
   * One tier member, through the same chokepoint a chat turn uses.
   *
   * This used to post an `OllamaGenerateRequest` straight at
   * `/api/v1/ollama/generate`, which pinned every candidate to a local model —
   * an account with only a cloud connector could not run this mode at all —
   * and metered through a second, parallel accounting path. It now carries the
   * full context bundle and can name any connector the user has.
   */
  private async runOneCall(
    bundle: ChatContextBundle,
    content: string,
    model: string,
  ): Promise<EnsembleCandidate> {
    const start = Date.now();
    const parsed = parseJudgeModel(model);
    const provider = parsed.provider ?? OLLAMA_PROVIDER;

    const response = await this.modeExecutionGateway.run({
      bundle,
      prompt: content,
      provider,
      model: parsed.model.length > 0 ? parsed.model : model,
      ledgerContext: TokenLedgerContext.COST_ENSEMBLE,
      paygCall: {
        workflow: PAYG_WORKFLOW_COST_ENSEMBLE,
        requestId: `cost-ensemble:candidate:${randomUUID()}`,
      },
    });

    // Quota is no longer recorded here: `callProvider` is the universal token
    // deduction chokepoint and records every call that passes through it. The
    // hand-rolled `recordUsage` this method used to make was a second path to
    // the same ledger, which is exactly what this batch removes.
    return {
      model,
      response: (response.content ?? '').trim(),
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
      const candidate = candidates.at(i);
      if (!candidate) {
        continue;
      }
      const result = this.qualityCheckManager.checkResponseQuality(candidate.response, content);
      if (result.score > bestScore) {
        bestScore = result.score;
        bestIndex = i;
      }
    }

    const bestCandidate = candidates.at(bestIndex);
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

  private async resolveSelection(
    dto: CostEnsembleMessageDto,
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
        await this.resolveModel(),
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
    const actualModel = overrides?.requestedModel ?? (await this.resolveModel());
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

  private defaultClassification(): RawClassification {
    return {
      complexity: 0.3,
      risk: 0.2,
      ambiguity: 0.2,
      reasoning: 'Classification unavailable',
    };
  }
}
