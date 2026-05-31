import { Injectable, Logger } from '@nestjs/common';
import { ProgressActorType, StreamEventType } from '../../../common/enums';
import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';

import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import {
  DEFAULT_PIPELINE_MODEL,
  PIPELINE_STAGE_TIMEOUT_MS,
  PIPELINE_TEMPLATES,
} from '../constants/pipeline.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { AccessControlService } from '../services/access-control.service';
import { ChatStreamService } from '../services/chat-stream.service';
import { AdvancedModuleModelSelectionService } from '../services/advanced-module-model-selection.service';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import { ResearchEnricherManager } from './research-enricher.manager';
import { prependResearchEvidence } from '../utilities/research-prompt.utility';
import type { PipelineMessageDto } from '../dto/pipeline-message.dto';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
import type { PipelineResponse, PipelineStage, PipelineStageResult } from '../types/pipeline.types';
import type { OllamaGenerateRequest, OllamaGenerateResponse } from '../types/execution.types';
import type { ResearchTranscript } from '../types/research-transcript.types';
import { type Prisma, type RoutingMode } from '../../../generated/prisma';

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
    private readonly researchEnricherManager: ResearchEnricherManager,
    private readonly accessControlService: AccessControlService,
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
      const config = AppConfig.get();
      // Enrich ONCE before the pipeline runs — every stage gets the same
      // evidence prepended to its prompt so a downstream stage (e.g.
      // "format") sees the same web facts as an upstream stage (e.g.
      // "research"). Pipeline templates are stage chains of varying
      // specialization; one shared enrichment keeps the FE badge consistent.
      const enrichment = await this.researchEnricherManager.enrichForOrchestration({
        threadId,
        mode: dto.researchMode,
        query: content,
        userToken: userToken ?? '',
        providerId: dto.researchProviderId,
      });
      const stageResults = await this.runAllStages(
        stages,
        content,
        config.OLLAMA_SERVICE_URL,
        enrichment.systemPrompt,
        userId,
      );
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

      this.chatStreamService.emitCompletion(threadId, 'local-ollama', resolvedModel);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Pipeline execution failed';
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

  private async runAllStages(
    stages: PipelineStage[],
    content: string,
    ollamaUrl: string,
    researchEvidence: string,
    userId: string,
  ): Promise<PipelineStageResult[]> {
    const results: PipelineStageResult[] = [];
    let previousOutput = content;

    for (const stage of stages) {
      const result = await this.runStage(
        stage,
        previousOutput,
        ollamaUrl,
        researchEvidence,
        userId,
      );
      results.push(result);
      previousOutput = result.output;
    }

    return results;
  }

  private async runStage(
    stage: PipelineStage,
    input: string,
    ollamaUrl: string,
    researchEvidence: string,
    userId: string,
  ): Promise<PipelineStageResult> {
    const startTime = Date.now();
    const basePrompt = `${stage.instruction}\n\n${input}`;
    const prompt = prependResearchEvidence(basePrompt, researchEvidence);
    const model = await this.resolveModel(stage.model);

    const requestBody: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false,
      think: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${ollamaUrl}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: PIPELINE_STAGE_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(
        `Pipeline stage "${stage.name}" failed with status ${String(response.status)}`,
      );
    }

    // Universal token deduction: each pipeline stage is a real LLM call.
    void this.accessControlService.recordUsage({
      userId,
      planId: null,
      inputTokens: response.data.promptEvalCount ?? 0,
      outputTokens: response.data.evalCount ?? 0,
      provider: 'local-ollama',
      model,
    });

    return {
      stageName: stage.name,
      model,
      output: response.data.response.trim(),
      latencyMs: Date.now() - startTime,
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
