import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ProgressActorType, StreamEventType } from '../../../common/enums';
import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import { OrchestrationStageStatus } from '../../../common/enums/orchestration-stage-status.enum';
import { ResearchMode } from '../../../common/enums/research-mode.enum';

import {
  DEFAULT_DECOMPOSITION_MODEL,
  MAX_SUB_TASKS_PARSE_LIMIT,
} from '../constants/task-decomposition.constants';
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
import type { DecomposeTaskDto } from '../dto/decompose-task.dto';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
import type { ChatContextBundle } from '../types/chat-context-gateway.types';
import type {
  SubTask,
  SubTaskResult,
  TaskDecompositionResponse,
} from '../types/task-decomposition.types';
import type { ResearchTranscript } from '../types/research-transcript.types';
import { type Prisma, type RoutingMode } from '../../../generated/prisma';
import { OLLAMA_PROVIDER } from '../../../common/constants';
import { PAYG_WORKFLOW_TASK_DECOMPOSITION } from '../constants/payg.constants';

/**
 * Splits a task into sub-tasks, runs them, and merges the answers.
 *
 * This mode had the worst context loss in the codebase, and it was structural
 * rather than incidental:
 *
 *  - The planner hop wrapped the user's words in a hardcoded
 *    `"You are a task decomposition assistant…Task:\n---\n${content}\n---"`
 *    string and posted it at `/api/v1/ollama/generate`. No history, no files,
 *    no memories, no thread system prompt — the planner split a task it could
 *    only see one sentence of.
 *  - Each sub-task then ran with `prompt: subTask.instruction` and nothing
 *    else, so the ORIGINAL USER TEXT never reached the model that did the
 *    work. A sub-task reading "check the config file" arrived at a model with
 *    no idea which project, which file, or what was being asked — and the
 *    merge step was then asked to synthesise those blind answers.
 *  - All three hops metered through `meterOrchestrationCall` plus a
 *    hand-rolled `recordUsage`, a second accounting path beside the one
 *    `callProvider` already owns, and being posted at Ollama directly pinned
 *    the whole mode to a local model: an account with only a cloud connector
 *    could not decompose anything.
 *
 * One bundle is now built before planning and shared by the planner, every
 * sub-task and the merge, so each hop sees the same conversation, attachments
 * and memories, and one set of retrievals pays for the whole run.
 */
@Injectable()
export class TaskDecompositionManager {
  private readonly logger = new Logger(TaskDecompositionManager.name);

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

  async executeDecomposition(
    userId: string,
    dto: DecomposeTaskDto,
    userToken: string,
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

    void this.executeInBackground(
      threadId,
      dto.content,
      dto.maxSubTasks,
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
    maxSubTasks: number,
    userId: string,
    selection?: AdvancedModelSelectionResolution,
    researchMode?: ResearchMode,
    researchProviderId?: string,
    userToken?: string,
    fileIds?: string[],
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
      this.safeEmitStage(threadId, {
        label: 'Decomposing prompt',
        status: OrchestrationStageStatus.ACTIVE,
        detail: `Planning up to ${String(maxSubTasks)} sub-tasks`,
        stageId: 'decompose:plan',
      });
      // Enrich ONCE — sub-task generation, sub-task execution, AND the merge
      // step all reuse the same evidence so the model can ground at every
      // hop without re-querying research-service.
      const enrichment = await this.researchEnricherManager.enrichForOrchestration({
        threadId,
        mode: researchMode,
        query: content,
        userToken: userToken ?? '',
        providerId: researchProviderId,
      });
      // ONE bundle for the entire run — planner, every sub-task and the merge.
      // Building it per hop would re-run history, memory, attachment and
      // cross-thread retrieval once per sub-task to produce bundles that differ
      // only by the question asked, and a five-sub-task run would pay for the
      // same retrievals seven times.
      const bundle = await this.chatContextGateway.build({
        userId,
        threadId,
        surface: ChatSurface.DECOMPOSE,
        historyLimit: MODE_HISTORY_MESSAGE_LIMIT,
        // The enricher's transcript used to be glued to the front of every raw
        // prompt by `prependResearchEvidence`. It is an instruction about how
        // to answer, so it belongs in the system prompt beside the user's own —
        // appended, never replacing.
        ...(enrichment.systemPrompt.length > 0
          ? { personaInstruction: enrichment.systemPrompt }
          : {}),
        ...(fileIds !== undefined && fileIds.length > 0 ? { fileIds } : {}),
      });
      const subTasks = await this.decomposeContent(content, maxSubTasks, resolvedSelection, bundle);
      this.safeEmitStage(threadId, {
        label: 'Decomposing prompt',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `${String(subTasks.length)} sub-tasks planned`,
        stageId: 'decompose:plan',
      });
      this.chatStreamService.emitProgressStage(threadId, StreamEventType.RESPONSE_STREAMING, {
        label: 'Executing sub-tasks',
        description: `${String(subTasks.length)} sub-tasks are running in parallel.`,
        actorType: ProgressActorType.SYSTEM,
        actorName: 'Task decomposition',
      });
      const subTaskResults = await this.executeSubTasks(
        threadId,
        subTasks,
        resolvedSelection,
        bundle,
      );
      this.safeEmitStage(threadId, {
        label: 'Aggregating',
        status: OrchestrationStageStatus.ACTIVE,
        detail: 'Merging sub-task results into a final answer',
        stageId: 'decompose:aggregate',
      });
      const mergedContent = await this.mergeResults(
        content,
        subTaskResults,
        resolvedSelection,
        bundle,
      );
      this.safeEmitStage(threadId, {
        label: 'Aggregating',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `${String(subTaskResults.length)} sub-tasks merged`,
        stageId: 'decompose:aggregate',
      });
      const resolvedModel = resolvedSelection.actualModel;

      await this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: mergedContent,
        provider: 'local-ollama',
        model: resolvedModel,
        latencyMs: Date.now() - startTime,
        usedFallback: false,
        metadata: this.buildDecomposeMetadata(
          resolvedSelection,
          resolvedModel,
          subTaskResults,
          enrichment.transcript,
        ) as Prisma.InputJsonValue,
      });

      this.safeEmitStage(threadId, {
        label: 'Complete',
        status: OrchestrationStageStatus.COMPLETED,
        stageId: 'decompose:complete',
      });
      this.chatStreamService.emitCompletion(threadId, 'local-ollama', resolvedModel);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Task decomposition failed';
      this.logger.error(`executeInBackground: failed for thread ${threadId} - ${errorMsg}`);
      this.safeEmitStage(threadId, {
        label: 'Decomposition failed',
        status: OrchestrationStageStatus.ERROR,
        detail: errorMsg,
        stageId: 'decompose:error',
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

  private buildDecomposeMetadata(
    resolvedSelection: AdvancedModelSelectionResolution,
    resolvedModel: string,
    subTaskResults: Array<unknown>,
    researchTranscript: ResearchTranscript | null,
  ): Record<string, unknown> {
    return {
      decomposed: true,
      subTasks: subTaskResults,
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
    };
  }

  /**
   * The planning hop, through the same chokepoint a chat turn uses.
   *
   * The decomposition framing is a PERSONA — it tells the model who to be and
   * what shape to answer in. It used to be concatenated in front of the user's
   * task, which made it look like part of what the user had typed, and the
   * whole thing was posted at Ollama with no conversation around it. It is now
   * appended to the bundle's system prompt, and the user's own `content` is the
   * prompt, so the planner splits the task while seeing the thread, the files
   * and the memories that say what the task is about.
   */
  private async decomposeContent(
    content: string,
    maxSubTasks: number,
    selection: AdvancedModelSelectionResolution,
    bundle: ChatContextBundle,
  ): Promise<SubTask[]> {
    const model = selection.actualModel;
    const parsed = parseJudgeModel(model);
    const provider = parsed.provider ?? OLLAMA_PROVIDER;

    const response = await this.modeExecutionGateway.run({
      bundle: this.withPersona(bundle, this.buildPlannerPersona(maxSubTasks)),
      prompt: content,
      provider,
      model: parsed.model.length > 0 ? parsed.model : model,
      ledgerContext: TokenLedgerContext.TASK_DECOMPOSITION,
      paygCall: {
        workflow: PAYG_WORKFLOW_TASK_DECOMPOSITION,
        requestId: `task-decomposition:decompose:${randomUUID()}`,
      },
    });

    // Quota is no longer recorded here: `callProvider` behind the execution
    // gateway is the universal token-deduction chokepoint and records every
    // call that passes through it. The hand-rolled `recordUsage` this method
    // used to make was a second path to the same ledger.
    return this.parseSubTasks((response.content ?? '').trim(), content);
  }

  private buildPlannerPersona(maxSubTasks: number): string {
    return `You are a task decomposition assistant. Break the user's task into ${String(maxSubTasks)} or fewer focused sub-tasks.

Return a JSON array of sub-tasks. Each sub-task must have: title (string), instruction (string), category (string: "research"|"reasoning"|"coding"|"writing"|"analysis"|"general"). Return ONLY the JSON array, no markdown, no explanation.`;
  }

  private parseSubTasks(raw: string, originalContent: string): SubTask[] {
    try {
      const cleaned = raw
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '')
        .trim();
      const parsed: unknown = JSON.parse(cleaned);
      return !Array.isArray(parsed) || parsed.length === 0 ? this.buildFallbackSubTasks(originalContent) : (parsed as SubTask[]).slice(0, MAX_SUB_TASKS_PARSE_LIMIT);
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

  /**
   * Sub-tasks run in PARALLEL, and deliberately still do.
   *
   * The planner emits independent sub-tasks — nothing in the parsed shape
   * carries a dependency or an ordering constraint, and the merge step is what
   * puts the answers back together. Running them sequentially would multiply
   * wall-clock latency by the sub-task count for no correctness gain, so
   * `Promise.allSettled` is kept: one failed sub-task becomes a recorded
   * failure row rather than losing the whole run.
   */
  private async executeSubTasks(
    threadId: string,
    subTasks: SubTask[],
    selection: AdvancedModelSelectionResolution,
    bundle: ChatContextBundle,
  ): Promise<SubTaskResult[]> {
    const fallbackModel = selection.actualModel;
    const total = subTasks.length;
    const results = await Promise.allSettled(
      subTasks.map((subTask, index) => {
        const stageId = `decompose:subtask:${String(index + 1)}`;
        this.safeEmitStage(threadId, {
          label: `Sub-task ${String(index + 1)}/${String(total)}`,
          status: OrchestrationStageStatus.ACTIVE,
          detail: subTask.title,
          stageId,
        });
        return this.executeOneSubTask(subTask, selection, bundle).then(
          (value) => {
            this.safeEmitStage(threadId, {
              label: `Sub-task ${String(index + 1)}/${String(total)}`,
              status: OrchestrationStageStatus.COMPLETED,
              detail: subTask.title,
              stageId,
            });
            return value;
          },
          (reason: unknown) => {
            const errMsg = reason instanceof Error ? reason.message : 'Sub-task failed';
            this.safeEmitStage(threadId, {
              label: `Sub-task ${String(index + 1)}/${String(total)}`,
              status: OrchestrationStageStatus.ERROR,
              detail: `${subTask.title} — ${errMsg}`,
              stageId,
            });
            throw reason instanceof Error ? reason : new Error(errMsg);
          },
        );
      }),
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
   * One sub-task, on top of the SAME bundle the planner used.
   *
   * This is the defect this migration exists to fix. The sub-task used to be
   * sent as `prompt: prependResearchEvidence(subTask.instruction, evidence)` —
   * the instruction and nothing else. The user's original words never reached
   * the model, so a sub-task like "check the config file" arrived with no
   * project, no file, no attachment and no conversation: the planner knew what
   * the task was, and then threw that away before the work was done.
   *
   * Sharing the bundle means the instruction is APPENDED as a user turn after
   * the real conversation, so the sub-task carries the user's original text,
   * their files, their memories and the thread's system prompt.
   */
  private async executeOneSubTask(
    subTask: SubTask,
    selection: AdvancedModelSelectionResolution,
    bundle: ChatContextBundle,
  ): Promise<SubTaskResult> {
    const startTime = Date.now();
    const model = selection.actualModel;
    const parsed = parseJudgeModel(model);
    const provider = parsed.provider ?? OLLAMA_PROVIDER;

    const response = await this.modeExecutionGateway.run({
      bundle,
      prompt: subTask.instruction,
      provider,
      model: parsed.model.length > 0 ? parsed.model : model,
      ledgerContext: TokenLedgerContext.TASK_DECOMPOSITION,
      paygCall: {
        workflow: PAYG_WORKFLOW_TASK_DECOMPOSITION,
        requestId: `task-decomposition:sub-task:${randomUUID()}`,
      },
    });

    return {
      title: subTask.title,
      instruction: subTask.instruction,
      category: subTask.category,
      result: (response.content ?? '').trim(),
      provider: 'local-ollama',
      model,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * The merge hop, on the same bundle again.
   *
   * The synthesis framing is a persona for the same reason the planner's is,
   * and the merge now sees the conversation too — it used to synthesise
   * sub-task answers while knowing only the one sentence of the task that was
   * pasted into its prompt.
   */
  private async mergeResults(
    originalContent: string,
    subTaskResults: SubTaskResult[],
    selection: AdvancedModelSelectionResolution,
    bundle: ChatContextBundle,
  ): Promise<string> {
    const model = selection.actualModel;
    const parsed = parseJudgeModel(model);
    const provider = parsed.provider ?? OLLAMA_PROVIDER;

    const subTasksSummary = subTaskResults
      .map((r, i) => `## Sub-task ${String(i + 1)}: ${r.title}\n${r.result}`)
      .join('\n\n');

    const mergePrompt = `Original task:
---
${originalContent}
---

Sub-task results:
---
${subTasksSummary}
---

Provide a unified, coherent response that integrates all sub-task results into a single well-structured answer.`;

    const response = await this.modeExecutionGateway.run({
      bundle: this.withPersona(bundle, this.buildSynthesisPersona()),
      prompt: mergePrompt,
      provider,
      model: parsed.model.length > 0 ? parsed.model : model,
      ledgerContext: TokenLedgerContext.TASK_DECOMPOSITION,
      paygCall: {
        workflow: PAYG_WORKFLOW_TASK_DECOMPOSITION,
        requestId: `task-decomposition:merge:${randomUUID()}`,
      },
    });

    const merged = (response.content ?? '').trim();
    if (merged.length === 0) {
      throw new Error('Ollama returned an empty merge response');
    }

    return merged;
  }

  private buildSynthesisPersona(): string {
    return 'You are a synthesis assistant. The user’s task was decomposed into sub-tasks and each was executed. Synthesize all sub-task results into a single coherent, well-structured final answer.';
  }

  /**
   * A hop's framing, derived locally from the run's single bundle.
   *
   * Asking the context gateway again per hop would re-run history, memory,
   * attachment and cross-thread retrieval to produce a bundle that differs by
   * one string. The gateway's own `personaInstruction` handling is exactly this
   * append, so doing it here is the same result at one retrieval set.
   *
   * Appended, never replacing: the thread's system prompt and the research
   * evidence already in the shared bundle are the user's instructions, and a
   * planner or synthesis framing is an addition to them.
   */
  private withPersona(bundle: ChatContextBundle, instruction: string): ChatContextBundle {
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
    return DEFAULT_DECOMPOSITION_MODEL !== 'AUTO' ? DEFAULT_DECOMPOSITION_MODEL : this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
  }

  private async resolveSelection(dto: DecomposeTaskDto): Promise<AdvancedModelSelectionResolution> {
    return this.advancedModelSelectionService ? this.advancedModelSelectionService.resolveSelection(
        {
          modelSelectionMode: dto.modelSelectionMode,
          requestedProvider: dto.requestedProvider,
          requestedModel: dto.requestedModel,
          requestedDisplayName: dto.requestedDisplayName,
          selectedModelSource: dto.selectedModelSource,
        },
        await this.resolveModel(),
      ) : this.buildAutoSelection({
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
