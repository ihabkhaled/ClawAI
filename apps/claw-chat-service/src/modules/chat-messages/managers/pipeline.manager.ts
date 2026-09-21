import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ProgressActorType, StreamEventType } from '../../../common/enums';
import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import { OrchestrationStageStatus } from '../../../common/enums/orchestration-stage-status.enum';

import { DEFAULT_PIPELINE_MODEL, PIPELINE_TEMPLATES } from '../constants/pipeline.constants';
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
import { ResearchEnricherManager } from './research-enricher.manager';
import type { PipelineMessageDto } from '../dto/pipeline-message.dto';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
import type { ChatContextBundle } from '../types/chat-context-gateway.types';
import type { PipelineResponse, PipelineStage, PipelineStageResult } from '../types/pipeline.types';
import type { ResearchTranscript } from '../types/research-transcript.types';
import { type Prisma, type RoutingMode } from '../../../generated/prisma';
import { OLLAMA_PROVIDER } from '../../../common/constants';
import { PAYG_WORKFLOW_PIPELINE } from '../constants/payg.constants';

/**
 * Runs a multi-stage specialist pipeline (analyze → reason → format by default,
 * or a custom stage list). Stage output feeds into the next stage.
 *
 * Model selection semantics:
 * - AUTO: each stage uses its category-specialized local model (analyzer, reasoner,
 *   formatter) resolved from the installed-model inventory.
 * - MANUAL_MODEL: ALL stages execute with the single user-selected model. Stage
 *   specialization still drives prompts; only the execution model is unified.
 *   Per-stage override is not yet supported — tracked as future work.
 * - Validation: if the requested model is unsupported or unavailable,
 *   AdvancedModuleModelSelectionService throws BusinessException before any stage runs.
 */
@Injectable()
export class PipelineManager {
  private readonly logger = new Logger(PipelineManager.name);

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
    private readonly chatContextGateway: ChatContextGatewayManager,
    private readonly modeExecutionGateway: ModeExecutionGatewayManager,
    private readonly researchEnricherManager: ResearchEnricherManager,
    private readonly advancedModelSelectionService?: AdvancedModuleModelSelectionService,
    private readonly localModelSelection?: LocalModelSelectionService,
  ) {}

  async executePipeline(
    userId: string,
    dto: PipelineMessageDto,
    userToken: string,
  ): Promise<PipelineResponse> {
    this.logger.log(`executePipeline: starting for user ${userId}`);

    const threadId = await this.resolveThreadId(userId, dto);
    const selection = await this.resolveSelection(dto);
    this.chatStreamService.emitRequestAccepted(threadId);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: dto.content,
      metadata: { pipelineRequest: true, modelSelection: selection },
    });

    void this.executeInBackground(threadId, dto.content, dto, userId, selection, userToken);

    return { messageId: userMessage.id, threadId };
  }

  async executeInBackground(
    threadId: string,
    content: string,
    dto: PipelineMessageDto,
    userId: string,
    selection?: AdvancedModelSelectionResolution,
    userToken?: string,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const resolvedSelection = selection ?? (await this.buildAutoSelection());
      this.chatStreamService.emitProgressStage(threadId, StreamEventType.RESPONSE_STREAMING, {
        label: 'Preparing pipeline',
        description: 'Resolving the pipeline stages for this request.',
        actorType: ProgressActorType.SYSTEM,
        actorName: 'Pipeline workflow',
      });
      const stages = await this.resolveStages(dto, resolvedSelection);
      this.chatStreamService.emitProgressStage(threadId, StreamEventType.RESPONSE_STREAMING, {
        label: 'Running pipeline',
        description: `${String(stages.length)} stages are executing in order.`,
        actorType: ProgressActorType.SYSTEM,
        actorName: 'Pipeline workflow',
      });
      // Enrich ONCE before the pipeline runs — every stage sees the same
      // evidence, so a downstream stage (e.g. "format") works from the same web
      // facts as an upstream stage (e.g. "research"). Pipeline templates are
      // stage chains of varying specialization; one shared enrichment keeps the
      // FE badge consistent.
      const enrichment = await this.researchEnricherManager.enrichForOrchestration({
        threadId,
        mode: dto.researchMode,
        query: content,
        userToken: userToken ?? '',
        providerId: dto.researchProviderId,
      });
      // One bundle for the whole chain, built WITHOUT any stage persona: the
      // stages work on one question about one conversation, so one set of
      // history, memory, attachment and cross-thread retrievals serves the
      // run. A five-stage template would otherwise pay for them five times.
      // The enricher's transcript rides in as a persona rather than being
      // glued to the front of every stage prompt by `prependResearchEvidence`:
      // it says how to answer, so it belongs in the system prompt beside the
      // user's own — appended, never replacing.
      const bundle = await this.chatContextGateway.build({
        userId,
        threadId,
        surface: ChatSurface.PIPELINE,
        historyLimit: MODE_HISTORY_MESSAGE_LIMIT,
        ...(enrichment.systemPrompt.length > 0
          ? { personaInstruction: enrichment.systemPrompt }
          : {}),
        ...(dto.fileIds !== undefined && dto.fileIds.length > 0 ? { fileIds: dto.fileIds } : {}),
      });
      const stageResults = await this.runAllStages(threadId, stages, content, bundle);
      const finalOutput = stageResults.at(-1)?.output ?? content;
      const resolvedModel = resolvedSelection.actualModel;

      await this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: finalOutput,
        provider: 'local-ollama',
        model: resolvedModel,
        latencyMs: Date.now() - startTime,
        usedFallback: false,
        metadata: this.buildPipelineMetadata(
          dto,
          resolvedSelection,
          resolvedModel,
          stageResults,
          enrichment.transcript,
        ) as Prisma.InputJsonValue,
      });

      this.safeEmitStage(threadId, {
        label: 'Complete',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `${String(stageResults.length)} stages produced final output`,
        stageId: 'pipeline:complete',
      });
      this.chatStreamService.emitCompletion(threadId, 'local-ollama', resolvedModel);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Pipeline execution failed';
      this.logger.error(`executeInBackground: failed for thread ${threadId} - ${errorMsg}`);
      this.safeEmitStage(threadId, {
        label: 'Pipeline failed',
        status: OrchestrationStageStatus.ERROR,
        detail: errorMsg,
        stageId: 'pipeline:error',
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

  private buildPipelineMetadata(
    dto: PipelineMessageDto,
    resolvedSelection: AdvancedModelSelectionResolution,
    resolvedModel: string,
    stageResults: Array<{ output: string }>,
    researchTranscript: ResearchTranscript | null,
  ): Record<string, unknown> {
    return {
      pipeline: true,
      template: dto.template,
      stages: stageResults,
      stageCount: stageResults.length,
      modelSelection: resolvedSelection,
      ...(researchTranscript === null ? {} : { researchTranscript }),
      routeRoadmap: {
        routingMode: resolvedSelection.modelSelectionMode,
        routerModel: null,
        selectedProvider: resolvedSelection.requestedProvider ?? resolvedSelection.actualProvider,
        selectedModel: resolvedSelection.requestedModel ?? resolvedModel,
        finalProvider: resolvedSelection.actualProvider,
        finalModel: resolvedModel,
        finalDisplayName: resolvedModel,
        steps: [
          {
            stage: 'tool',
            provider: 'pipeline',
            model: dto.template,
            displayName: 'Pipeline workflow',
            description: `${String(stageResults.length)} stages completed`,
          },
          {
            stage: 'execution',
            provider: 'local-ollama',
            model: resolvedModel,
            displayName: resolvedModel,
          },
        ],
      },
      progressSummary: [
        {
          label: 'Request accepted',
          description: 'Pipeline execution was queued.',
          actorType: 'request',
          actorName: 'Claw',
          status: 'completed',
        },
        {
          label: 'Running pipeline',
          description: `${String(stageResults.length)} stages completed.`,
          actorType: 'system',
          actorName: 'Pipeline workflow',
          status: 'completed',
        },
        {
          label: 'Response complete',
          description: 'Pipeline result saved to the thread.',
          actorType: 'model',
          actorName: `local-ollama / ${resolvedModel}`,
          status: 'completed',
        },
      ],
    };
  }

  private async resolveStages(
    dto: PipelineMessageDto,
    selection: AdvancedModelSelectionResolution,
  ): Promise<PipelineStage[]> {
    if (dto.template !== 'custom') {
      return this.resolveStageModels(PIPELINE_TEMPLATES[dto.template] ?? [], selection);
    }
    return this.resolveStageModels(dto.customStages ?? [], selection);
  }

  /**
   * The chain, in order, one stage at a time.
   *
   * The sequential `await` below is a REAL data dependency, not an
   * un-parallelised loop: stage N is called with stage N-1's output as its
   * input, so running two stages at once would feed the later one the user's
   * raw text instead of the analysis it is supposed to reason over. Do not
   * convert this to `Promise.all`; that would silently turn a pipeline into a
   * fan-out of N independent one-shot answers.
   */
  private async runAllStages(
    threadId: string,
    stages: PipelineStage[],
    content: string,
    bundle: ChatContextBundle,
  ): Promise<PipelineStageResult[]> {
    const results: PipelineStageResult[] = [];
    let previousOutput = content;
    const total = stages.length;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages.at(i);
      if (!stage) {
        continue;
      }
      const stepNumber = i + 1;
      const stageId = `pipeline:step:${String(stepNumber)}`;
      this.safeEmitStage(threadId, {
        label: `Step ${String(stepNumber)}/${String(total)}: ${stage.name}`,
        status: OrchestrationStageStatus.ACTIVE,
        detail: stage.model ?? 'local-ollama',
        stageId,
      });
      try {
        // Sequential on purpose: `previousOutput` is this stage's input.
        const result = await this.runStage(stage, previousOutput, bundle);
        results.push(result);
        previousOutput = result.output;
        this.safeEmitStage(threadId, {
          label: `Step ${String(stepNumber)}/${String(total)}: ${stage.name}`,
          status: OrchestrationStageStatus.COMPLETED,
          detail: `${result.model} — ${String(result.latencyMs)}ms`,
          stageId,
        });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Stage failed';
        this.safeEmitStage(threadId, {
          label: `Step ${String(stepNumber)}/${String(total)}: ${stage.name}`,
          status: OrchestrationStageStatus.ERROR,
          detail: errMsg,
          stageId,
        });
        throw error;
      }
    }

    return results;
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
   * One stage, through the same chokepoint a chat turn uses.
   *
   * This used to build an `OllamaGenerateRequest` by hand and post it at
   * `/api/v1/ollama/generate`, which pinned every stage to a local model — an
   * account with only a cloud connector could not run a pipeline at all — and
   * metered through `meterOrchestrationCall` plus a hand-rolled `recordUsage`,
   * a second path to the ledger that `callProvider` already owns.
   *
   * The stage's instruction now reaches the model as a persona instead of as
   * prompt text glued in front of the input. Gluing it on made the instruction
   * part of what the user appeared to have typed, so a stage answered the
   * concatenation — and, worse, stage N's input is stage N-1's OUTPUT, so
   * every downstream stage was re-reading the previous stage's instruction
   * text as if it were content to transform.
   */
  private async runStage(
    stage: PipelineStage,
    input: string,
    bundle: ChatContextBundle,
  ): Promise<PipelineStageResult> {
    const startTime = Date.now();
    const model = await this.resolveModel(stage.model);
    const parsed = parseJudgeModel(model);
    const provider = parsed.provider ?? OLLAMA_PROVIDER;

    const response = await this.modeExecutionGateway.run({
      bundle: this.withStagePersona(bundle, stage.instruction),
      prompt: input,
      provider,
      model: parsed.model.length > 0 ? parsed.model : model,
      ledgerContext: TokenLedgerContext.PIPELINE,
      paygCall: {
        workflow: PAYG_WORKFLOW_PIPELINE,
        requestId: `pipeline:stage:${randomUUID()}`,
      },
    });

    // Quota is no longer recorded here: `callProvider` is the universal token
    // deduction chokepoint and records every call that passes through it. The
    // hand-rolled `recordUsage` this method used to make was a second path to
    // the same ledger, which is exactly what this batch removes.
    return {
      stageName: stage.name,
      model,
      output: (response.content ?? '').trim(),
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * The stage's persona, derived locally from the run's single bundle.
   *
   * Asking the context gateway again per stage would re-run history, memory,
   * attachment and cross-thread retrieval once per stage to produce bundles
   * that differ by one string. The gateway's own `personaInstruction` handling
   * is exactly this append, so doing it here is the same result at one
   * retrieval set.
   *
   * Appended, never replacing: the thread's system prompt and the research
   * evidence already in the shared bundle are the user's instructions, and a
   * stage instruction is an addition to them.
   */
  private withStagePersona(bundle: ChatContextBundle, instruction: string): ChatContextBundle {
    if (instruction.trim().length === 0) {
      return bundle;
    }
    const existing = bundle.context.systemPrompt;
    return {
      ...bundle,
      context: {
        ...bundle.context,
        systemPrompt:
          existing === null || existing.trim().length === 0
            ? instruction
            : `${existing}\n\n${instruction}`,
      },
    };
  }

  private async resolveStageModels(
    stages: PipelineStage[],
    selection: AdvancedModelSelectionResolution,
  ): Promise<PipelineStage[]> {
    if (selection.modelSelectionMode === 'MANUAL_MODEL') {
      return stages.map((stage) => ({ ...stage, model: selection.actualModel }));
    }
    return Promise.all(
      stages.map(async (stage) => ({
        ...stage,
        model: await this.resolveModel(stage.model),
      })),
    );
  }

  private async resolveModel(model?: string): Promise<string> {
    if (model && model !== 'AUTO') {
      return model;
    }
    if (DEFAULT_PIPELINE_MODEL !== 'AUTO') {
      return DEFAULT_PIPELINE_MODEL;
    }
    return this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
  }

  private async resolveSelection(
    dto: PipelineMessageDto,
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

  private async resolveThreadId(userId: string, dto: PipelineMessageDto): Promise<string> {
    if (dto.threadId && dto.threadId.length > 0) {
      return dto.threadId;
    }
    const thread = await this.chatThreadsRepository.create({
      userId,
      title: `Pipeline: ${dto.content.slice(0, 50)}`,
      routingMode: 'MANUAL_MODEL' as RoutingMode,
    });
    return thread.id;
  }

  private async storeErrorMessage(threadId: string, errorMsg: string): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content: `Pipeline execution failed: ${errorMsg}`,
      provider: 'pipeline',
      model: 'pipeline',
      usedFallback: false,
      metadata: { pipeline: false, error: true },
    });
  }
}
