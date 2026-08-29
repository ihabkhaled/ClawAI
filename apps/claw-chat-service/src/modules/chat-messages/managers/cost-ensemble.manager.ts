import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { AppConfig } from '../../../app/config/app.config';
import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import { OrchestrationStageStatus } from '../../../common/enums/orchestration-stage-status.enum';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import {
  COST_ENSEMBLE_TIMEOUT_MS,
  COST_TIER_THRESHOLD_DUO,
  COST_TIER_THRESHOLD_TRIO,
  DEFAULT_COST_ENSEMBLE_MODEL,
} from '../constants/cost-ensemble.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { AccessControlService } from '../services/access-control.service';
import { ChatStreamService } from '../services/chat-stream.service';
import { AdvancedModuleModelSelectionService } from '../services/advanced-module-model-selection.service';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import { QualityCheckManager } from './quality-check.manager';
import { ResearchEnricherManager } from './research-enricher.manager';
import { prependResearchEvidence } from '../utilities/research-prompt.utility';
import type { CostEnsembleMessageDto } from '../dto/cost-ensemble-message.dto';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
import type {
  CostClassification,
  CostEnsembleResponse,
  CostTier,
  EnsembleCandidate,
  RawClassification,
} from '../types/cost-ensemble.types';
import type { OllamaGenerateRequest, OllamaGenerateResponse } from '../types/execution.types';
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
    private readonly researchEnricherManager: ResearchEnricherManager,
    private readonly accessControlService: AccessControlService,
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
  ): Promise<void> {
    try {
      const resolvedSelection = selection ?? (await this.buildAutoSelection());
      // Enrich ONCE — classification step skips evidence (it just labels the
      // task), every ensemble candidate sees the same evidence prepended to
      // its prompt.
      const enrichment = await this.researchEnricherManager.enrichForOrchestration({
        threadId,
        mode: researchMode,
        query: content,
        userToken: userToken ?? '',
        providerId: researchProviderId,
      });
      this.safeEmitStage(threadId, {
        label: 'Classifying task',
        status: OrchestrationStageStatus.ACTIVE,
        detail: 'Scoring complexity, risk, ambiguity',
        stageId: 'cost-ensemble:classify',
      });
      const rawClassification = await this.classifyTask(content, resolvedSelection, userId);
      const tier = this.determineTier(rawClassification);
      const classification: CostClassification = { tier, ...rawClassification };
      this.safeEmitStage(threadId, {
        label: 'Classifying task',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `Tier: ${tier} (complexity ${String(rawClassification.complexity.toFixed(2))})`,
        stageId: 'cost-ensemble:classify',
      });

      const candidates = await this.runEnsemble(
        threadId,
        content,
        tier,
        resolvedSelection,
        enrichment.systemPrompt,
        userId,
      );
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

  private async classifyTask(
    content: string,
    selection: AdvancedModelSelectionResolution,
    userId: string,
  ): Promise<RawClassification> {
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
      model: selection.actualModel,
      prompt: classifyPrompt,
      stream: false,
      think: false,
    };

    try {
      const response = await this.accessControlService.meterOrchestrationCall(
        {
          userId,
          requestId: `cost-ensemble:classify:${randomUUID()}`,
          provider: OLLAMA_PROVIDER,
          model: selection.actualModel,
          workflow: PAYG_WORKFLOW_COST_ENSEMBLE_CLASSIFY,
          promptText: requestBody.prompt,
        },
        async (hold) =>
          httpRequest<OllamaGenerateResponse>({
            url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
            method: 'POST',
            body: hold.clamped
              ? { ...requestBody, options: { num_predict: hold.maxOutputTokens } }
              : requestBody,
            timeoutMs: COST_ENSEMBLE_TIMEOUT_MS,
          }),
        (settled) => ({
          promptTokens: settled.data.promptEvalCount ?? 0,
          completionTokens: settled.data.evalCount ?? 0,
        }),
      );

      if (!response.ok) {
        return this.defaultClassification();
      }

      // Universal token deduction: the classifier hop is a real LLM call.
      void this.accessControlService.recordUsage({
        userId,
        planId: null,
        inputTokens: response.data.promptEvalCount ?? 0,
        outputTokens: response.data.evalCount ?? 0,
        provider: 'local-ollama',
        model: selection.actualModel,
      });

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

  private async runEnsemble(
    threadId: string,
    content: string,
    tier: CostTier,
    selection: AdvancedModelSelectionResolution,
    researchEvidence: string,
    userId: string,
  ): Promise<EnsembleCandidate[]> {
    const count = this.tierToCount(tier);
    const config = AppConfig.get();
    const model = selection.actualModel;

    const calls = Array.from({ length: count }, (_unused, index) => {
      const stageId = `cost-ensemble:provider:${String(index + 1)}`;
      this.safeEmitStage(threadId, {
        label: `Provider ${String(index + 1)}/${String(count)} dispatched`,
        status: OrchestrationStageStatus.ACTIVE,
        detail: model,
        stageId,
      });
      return this.runOneCall(
        config.OLLAMA_SERVICE_URL,
        content,
        model,
        researchEvidence,
        userId,
      ).then(
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

  private async runOneCall(
    ollamaServiceUrl: string,
    content: string,
    model: string,
    researchEvidence: string,
    userId: string,
  ): Promise<EnsembleCandidate> {
    const start = Date.now();
    const requestBody: OllamaGenerateRequest = {
      model,
      prompt: prependResearchEvidence(content, researchEvidence),
      stream: false,
      think: false,
    };

    const response = await this.accessControlService.meterOrchestrationCall(
      {
        userId,
        requestId: `cost-ensemble:candidate:${randomUUID()}`,
        provider: OLLAMA_PROVIDER,
        model,
        workflow: PAYG_WORKFLOW_COST_ENSEMBLE,
        promptText: requestBody.prompt,
      },
      async (hold) =>
        httpRequest<OllamaGenerateResponse>({
          url: `${ollamaServiceUrl}/api/v1/ollama/generate`,
          method: 'POST',
          body: hold.clamped
            ? { ...requestBody, options: { num_predict: hold.maxOutputTokens } }
            : requestBody,
          timeoutMs: COST_ENSEMBLE_TIMEOUT_MS,
        }),
      (settled) => ({
        promptTokens: settled.data.promptEvalCount ?? 0,
        completionTokens: settled.data.evalCount ?? 0,
      }),
    );

    if (!response.ok) {
      throw new Error(`Ollama returned status ${String(response.status)}`);
    }

    // Universal token deduction for every ensemble candidate.
    void this.accessControlService.recordUsage({
      userId,
      planId: null,
      inputTokens: response.data.promptEvalCount ?? 0,
      outputTokens: response.data.evalCount ?? 0,
      provider: 'local-ollama',
      model,
    });

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
