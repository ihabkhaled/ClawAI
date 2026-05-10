import { Injectable, Logger } from '@nestjs/common';
import { ProgressActorType, StreamEventType } from '../../../common/enums';
import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';

import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import {
  DECOMPOSITION_TIMEOUT_MS,
  DEFAULT_DECOMPOSITION_MODEL,
  MAX_SUB_TASKS_PARSE_LIMIT,
  MERGE_TIMEOUT_MS,
} from '../constants/task-decomposition.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import { AdvancedModuleModelSelectionService } from '../services/advanced-module-model-selection.service';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { DecomposeTaskDto } from '../dto/decompose-task.dto';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
import type {
  SubTask,
  SubTaskResult,
  TaskDecompositionResponse,
} from '../types/task-decomposition.types';
import type { OllamaGenerateRequest, OllamaGenerateResponse } from '../types/execution.types';
import { type RoutingMode } from '../../../generated/prisma';

@Injectable()
export class TaskDecompositionManager {
  private readonly logger = new Logger(TaskDecompositionManager.name);

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
    private readonly advancedModelSelectionService?: AdvancedModuleModelSelectionService,
    private readonly localModelSelection?: LocalModelSelectionService,
  ) {}

  async executeDecomposition(
    userId: string,
    dto: DecomposeTaskDto,
  ): Promise<TaskDecompositionResponse> {
    this.logger.log(`executeDecomposition: starting for user ${userId}`);

    const threadId = await this.resolveThreadId(userId, dto);
    const selection = await this.resolveSelection(dto);
    this.chatStreamService.emitRequestAccepted(threadId);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: dto.content,
      metadata: { decompositionRequest: true, modelSelection: selection },
    });

    void this.executeInBackground(threadId, dto.content, dto.maxSubTasks, selection);

    return { messageId: userMessage.id, threadId };
  }

  async executeInBackground(
    threadId: string,
    content: string,
    maxSubTasks: number,
    selection?: AdvancedModelSelectionResolution,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const resolvedSelection = selection ?? (await this.buildAutoSelection());
      this.chatStreamService.emitProgressStage(threadId, StreamEventType.RESPONSE_STREAMING, {
        label: 'Decomposing task',
        description: `Breaking the request into up to ${String(maxSubTasks)} sub-tasks.`,
        actorType: ProgressActorType.SYSTEM,
        actorName: 'Task decomposition',
      });
      const subTasks = await this.decomposeContent(content, maxSubTasks, resolvedSelection);
      this.chatStreamService.emitProgressStage(threadId, StreamEventType.RESPONSE_STREAMING, {
        label: 'Executing sub-tasks',
        description: `${String(subTasks.length)} sub-tasks are running in parallel.`,
        actorType: ProgressActorType.SYSTEM,
        actorName: 'Task decomposition',
      });
      const subTaskResults = await this.executeSubTasks(subTasks, resolvedSelection);
      const mergedContent = await this.mergeResults(content, subTaskResults, resolvedSelection);
      const resolvedModel = resolvedSelection.actualModel;

      await this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: mergedContent,
        provider: 'local-ollama',
        model: resolvedModel,
        latencyMs: Date.now() - startTime,
        usedFallback: false,
        metadata: {
          decomposed: true,
          subTasks: subTaskResults,
          modelSelection: resolvedSelection,
          routeRoadmap: {
            routingMode: resolvedSelection.modelSelectionMode,
            routerModel: null,
            selectedProvider:
              resolvedSelection.requestedProvider ?? resolvedSelection.actualProvider,
            selectedModel: resolvedSelection.requestedModel ?? resolvedModel,
            finalProvider: resolvedSelection.actualProvider,
            finalModel: resolvedModel,
            finalDisplayName: resolvedModel,
            steps: [
              {
                stage: 'tool',
                provider: 'decompose',
                model: 'task-decomposition',
                displayName: 'Task decomposition',
                description: `${String(subTaskResults.length)} sub-task results merged`,
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
              description: 'Task decomposition was queued.',
              actorType: 'request',
              actorName: 'Claw',
              status: 'completed',
            },
            {
              label: 'Executing sub-tasks',
              description: `${String(subTaskResults.length)} sub-tasks completed.`,
              actorType: 'system',
              actorName: 'Task decomposition',
              status: 'completed',
            },
            {
              label: 'Response complete',
              description: 'Merged result saved to the thread.',
              actorType: 'model',
              actorName: `local-ollama / ${resolvedModel}`,
              status: 'completed',
            },
          ],
        },
      });

      this.chatStreamService.emitCompletion(threadId, 'local-ollama', resolvedModel);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Task decomposition failed';
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

  private async decomposeContent(
    content: string,
    maxSubTasks: number,
    selection: AdvancedModelSelectionResolution,
  ): Promise<SubTask[]> {
    const config = AppConfig.get();
    const model = selection.actualModel;

    const prompt = `You are a task decomposition assistant. Break the following complex task into ${String(maxSubTasks)} or fewer focused sub-tasks.

Task:
---
${content}
---

Return a JSON array of sub-tasks. Each sub-task must have: title (string), instruction (string), category (string: "research"|"reasoning"|"coding"|"writing"|"analysis"|"general"). Return ONLY the JSON array, no markdown, no explanation.`;

    const requestBody: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false,
      think: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: DECOMPOSITION_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(`Ollama decomposition returned status ${String(response.status)}`);
    }

    return this.parseSubTasks(response.data.response.trim(), content);
  }

  private parseSubTasks(raw: string, originalContent: string): SubTask[] {
    try {
      const cleaned = raw
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '')
        .trim();
      const parsed: unknown = JSON.parse(cleaned);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return this.buildFallbackSubTasks(originalContent);
      }
      return (parsed as SubTask[]).slice(0, MAX_SUB_TASKS_PARSE_LIMIT);
    } catch {
      this.logger.warn('parseSubTasks: JSON parse failed, falling back to single task');
      return this.buildFallbackSubTasks(originalContent);
    }
  }

  private buildFallbackSubTasks(content: string): SubTask[] {
    return [
      {
        title: 'Complete Task',
        instruction: content,
        category: 'general',
      },
    ];
  }

  private async executeSubTasks(
    subTasks: SubTask[],
    selection: AdvancedModelSelectionResolution,
  ): Promise<SubTaskResult[]> {
    const fallbackModel = selection.actualModel;
    const results = await Promise.allSettled(
      subTasks.map((subTask) => this.executeOneSubTask(subTask, selection)),
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      const subTask = subTasks.at(index);
      return {
        title: subTask?.title ?? 'Unknown',
        instruction: subTask?.instruction ?? '',
        category: subTask?.category ?? 'general',
        result: `Sub-task failed: ${result.reason instanceof Error ? result.reason.message : 'Unknown error'}`,
        provider: 'local-ollama',
        model: fallbackModel,
        latencyMs: 0,
      };
    });
  }

  private async executeOneSubTask(
    subTask: SubTask,
    selection: AdvancedModelSelectionResolution,
  ): Promise<SubTaskResult> {
    const config = AppConfig.get();
    const startTime = Date.now();
    const model = selection.actualModel;

    const requestBody: OllamaGenerateRequest = {
      model,
      prompt: subTask.instruction,
      stream: false,
      think: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: DECOMPOSITION_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(`Sub-task execution failed with status ${String(response.status)}`);
    }

    return {
      title: subTask.title,
      instruction: subTask.instruction,
      category: subTask.category,
      result: response.data.response.trim(),
      provider: 'local-ollama',
      model,
      latencyMs: Date.now() - startTime,
    };
  }

  private async mergeResults(
    originalContent: string,
    subTaskResults: SubTaskResult[],
    selection: AdvancedModelSelectionResolution,
  ): Promise<string> {
    const config = AppConfig.get();
    const model = selection.actualModel;

    const subTasksSummary = subTaskResults
      .map((r, i) => `## Sub-task ${String(i + 1)}: ${r.title}\n${r.result}`)
      .join('\n\n');

    const mergePrompt = `You are a synthesis assistant. The following complex task was decomposed into sub-tasks and each was executed. Synthesize all sub-task results into a single coherent, well-structured final answer.

Original task:
---
${originalContent}
---

Sub-task results:
---
${subTasksSummary}
---

Provide a unified, coherent response that integrates all sub-task results into a single well-structured answer.`;

    const requestBody: OllamaGenerateRequest = {
      model,
      prompt: mergePrompt,
      stream: false,
      think: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: MERGE_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(`Merge step failed with status ${String(response.status)}`);
    }

    const merged = response.data.response.trim();
    if (merged.length === 0) {
      throw new Error('Ollama returned an empty merge response');
    }

    return merged;
  }

  private async resolveThreadId(userId: string, dto: DecomposeTaskDto): Promise<string> {
    if (dto.threadId && dto.threadId.length > 0) {
      return dto.threadId;
    }
    const thread = await this.chatThreadsRepository.create({
      userId,
      title: `Decompose: ${dto.content.slice(0, 50)}`,
      routingMode: 'MANUAL_MODEL' as RoutingMode,
    });
    return thread.id;
  }

  private async storeErrorMessage(threadId: string, errorMsg: string): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content: `Task decomposition failed: ${errorMsg}`,
      provider: 'decompose',
      model: 'decompose',
      usedFallback: false,
      metadata: { decomposed: false, error: true },
    });
  }

  private async resolveModel(): Promise<string> {
    if (DEFAULT_DECOMPOSITION_MODEL !== 'AUTO') {
      return DEFAULT_DECOMPOSITION_MODEL;
    }
    return this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
  }

  private async resolveSelection(dto: DecomposeTaskDto): Promise<AdvancedModelSelectionResolution> {
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
}
