import { Injectable, Logger } from '@nestjs/common';
import { CompareJudgeState, ProgressActorType, StreamEventType } from '../../../common/enums';
import { ChatExecutionManager } from './chat-execution.manager';
import { ContextAssemblyManager } from './context-assembly.manager';
import { JudgeRefereeManager } from './judge-referee.manager';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import {
  type ParallelJudgeConfig,
  type ParallelModelResponse,
  type ParallelModelTarget,
  type ParallelResponse,
} from '../types/parallel.types';
import { type ThreadSettings } from '../types/execution.types';
import { type AssembledContext } from '../types/context.types';
import { type ChatThread } from '../../../generated/prisma';
import { AppConfig } from '../../../app/config/app.config';
import { type JudgeRefereeResult, type JudgeReviewPayload } from '../types/judge-referee.types';

@Injectable()
export class ParallelExecutionManager {
  private readonly logger = new Logger(ParallelExecutionManager.name);
  private readonly timeoutMs: number;

  constructor(
    private readonly chatExecutionManager: ChatExecutionManager,
    private readonly contextAssemblyManager: ContextAssemblyManager,
    private readonly judgeRefereeManager: JudgeRefereeManager,
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
  ) {
    this.timeoutMs = AppConfig.get().OLLAMA_GENERATE_TIMEOUT_MS;
  }

  async executeParallel(
    userId: string,
    threadId: string,
    content: string,
    models: ParallelModelTarget[],
    judgeConfig: ParallelJudgeConfig,
    fileIds?: string[],
  ): Promise<ParallelResponse> {
    this.logger.log(
      `executeParallel: queuing ${String(models.length)} models in thread ${threadId}`,
    );
    this.chatStreamService.emitRequestAccepted(threadId);

    const userMessage = await this.storeUserMessage(threadId, content, judgeConfig, fileIds);

    void this.executeInBackground(userId, threadId, userMessage.id, models, judgeConfig, fileIds);

    return {
      messageId: userMessage.id,
      threadId,
      prompt: content,
      responses: [],
      totalLatencyMs: 0,
      completedCount: 0,
      failedCount: 0,
      judgeEnabled: judgeConfig.enabled,
      judgeModel: judgeConfig.model,
    };
  }

  private async executeInBackground(
    userId: string,
    threadId: string,
    parallelGroupId: string,
    models: ParallelModelTarget[],
    judgeConfig: ParallelJudgeConfig,
    fileIds?: string[],
  ): Promise<void> {
    try {
      this.chatStreamService.emitProgressStage(threadId, StreamEventType.RESPONSE_STREAMING, {
        label: 'Launching comparison',
        description: `${String(models.length)} models are being executed in parallel.`,
        actorType: ProgressActorType.SYSTEM,
        actorName: 'Parallel compare',
      });
      const { context, threadSettings } = await this.buildContext(userId, threadId, fileIds);
      const responses = await this.executeAllModels(
        models,
        context,
        threadSettings,
        judgeConfig,
        parallelGroupId,
        threadId,
      );
      await this.storeAssistantMessages(threadId, parallelGroupId, responses);
      const completed = responses.filter((r) => r.status === 'completed').length;
      this.logger.log(
        `executeInBackground: done — ${String(completed)}/${String(responses.length)} completed`,
      );
      this.chatStreamService.emitCompletion(threadId, 'parallel', 'parallel');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`executeInBackground: failed — ${msg}`);
      await this.storeAssistantMessages(threadId, parallelGroupId, [
        {
          ...this.buildFailedResponse('system', 'parallel', `Parallel execution failed: ${msg}`),
          judgeEnabled: judgeConfig.enabled,
          judgeModel: judgeConfig.model,
          judgeDisplayName: judgeConfig.model,
          judgeState: judgeConfig.enabled ? CompareJudgeState.SKIPPED : CompareJudgeState.NONE,
          judgeErrorState: judgeConfig.enabled ? CompareJudgeState.SKIPPED : null,
          judgeDialogAvailable: false,
          judgeReview: null,
        },
      ]);
      this.chatStreamService.emitError(threadId, `Parallel execution failed: ${msg}`);
    }
  }

  private async storeUserMessage(
    threadId: string,
    content: string,
    judgeConfig: ParallelJudgeConfig,
    fileIds?: string[],
  ): Promise<{ id: string }> {
    const metadata = {
      ...(fileIds && fileIds.length > 0 ? { fileIds } : {}),
      compareJudgeEnabled: judgeConfig.enabled,
      compareJudgeModel: judgeConfig.model,
    };

    return this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });
  }

  private async buildContext(
    userId: string,
    threadId: string,
    fileIds?: string[],
  ): Promise<{ context: AssembledContext; threadSettings: ThreadSettings | undefined }> {
    const thread = await this.chatThreadsRepository.findById(threadId);
    const threadSettings = this.extractThreadSettings(thread);
    const threadMessages = await this.chatMessagesRepository.findRecentByThreadId(threadId, 20);
    const chronologicalMessages = [...threadMessages].reverse();

    const context = await this.contextAssemblyManager.assemble(
      userId,
      chronologicalMessages,
      threadSettings,
      thread?.contextPackIds ?? undefined,
      fileIds,
    );

    return { context, threadSettings };
  }

  private async executeAllModels(
    models: ParallelModelTarget[],
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    judgeConfig: ParallelJudgeConfig,
    parallelGroupId: string,
    threadId: string,
  ): Promise<ParallelModelResponse[]> {
    const promises = models.map((target) =>
      this.executeWithTimeout(target, context, threadSettings),
    );

    const settled = await Promise.allSettled(promises);

    const baseResponses = settled.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }

      const target = models.at(index);
      return this.buildFailedResponse(
        target?.provider ?? 'unknown',
        target?.model ?? 'unknown',
        result.reason instanceof Error ? result.reason.message : 'Promise rejected',
      );
    });

    return this.applyJudgeToResponses(
      baseResponses,
      context,
      threadSettings,
      judgeConfig,
      parallelGroupId,
      threadId,
    );
  }

  private async applyJudgeToResponses(
    responses: ParallelModelResponse[],
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    judgeConfig: ParallelJudgeConfig,
    parallelGroupId: string,
    threadId: string,
  ): Promise<ParallelModelResponse[]> {
    if (!judgeConfig.enabled) {
      return responses.map((response) => ({
        ...response,
        judgeEnabled: false,
        judgeModel: null,
        judgeDisplayName: null,
        judgeState: CompareJudgeState.NONE,
        judgeErrorState: null,
        judgeDialogAvailable: false,
        judgeReview: null,
      }));
    }

    const judgeThreadSettings = this.buildJudgeThreadSettings(threadSettings, judgeConfig);
    const judgedResponses = await Promise.all(
      responses.map(async (response) => {
        if (response.status !== 'completed') {
          return {
            ...response,
            judgeEnabled: true,
            judgeModel: judgeConfig.model,
            judgeDisplayName: judgeConfig.model,
            judgeState: CompareJudgeState.SKIPPED,
            judgeErrorState: CompareJudgeState.SKIPPED,
            judgeDialogAvailable: false,
            judgeReview: null,
          };
        }

        return this.judgeSingleResponse(
          response,
          context,
          judgeThreadSettings,
          parallelGroupId,
          threadId,
          judgeConfig,
        );
      }),
    );

    return judgedResponses;
  }

  private async judgeSingleResponse(
    response: ParallelModelResponse,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
    parallelGroupId: string,
    threadId: string,
    judgeConfig: ParallelJudgeConfig,
  ): Promise<ParallelModelResponse> {
    const judgeModel = judgeConfig.model ?? null;
    this.chatStreamService.emitJudgeEvaluating(
      threadId,
      `${response.provider}/${response.model}`,
      judgeModel ?? 'AUTO',
    );

    try {
      const judgeResult = await this.judgeRefereeManager.evaluate(
        {
          content: response.content,
          provider: response.provider,
          model: response.model,
          latencyMs: response.latencyMs,
          usedFallback: false,
          inputTokens: response.inputTokens ?? undefined,
          outputTokens: response.outputTokens ?? undefined,
        },
        context,
        {
          enabled: true,
          category: undefined,
          routingMode: 'MANUAL_MODEL',
          isLocalOnly: false,
        },
        {
          messageId: parallelGroupId,
          threadId,
          selectedProvider: response.provider,
          selectedModel: response.model,
          routingMode: 'MANUAL_MODEL',
          timestamp: new Date().toISOString(),
          judgeEnabled: true,
        },
        threadSettings,
      );
      return this.buildJudgedResponse(response, judgeResult, judgeConfig);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown judge failure';
      return {
        ...response,
        judgeEnabled: true,
        judgeModel,
        judgeDisplayName: judgeModel,
        judgeState: CompareJudgeState.FAILED,
        judgeErrorState: CompareJudgeState.FAILED,
        judgeDialogAvailable: false,
        judgeReview: null,
        errorMessage: response.errorMessage ?? message,
      };
    }
  }

  private buildJudgedResponse(
    response: ParallelModelResponse,
    judgeResult: JudgeRefereeResult,
    judgeConfig: ParallelJudgeConfig,
  ): ParallelModelResponse {
    const judgeReview = this.judgeRefereeManager.buildMetadata(judgeResult).judgeReview;
    const state = this.resolveJudgeState(judgeResult, judgeReview, response.status);
    const judgeErrorState = this.resolveJudgeErrorState(judgeResult.judgeVerdict.fallbackState);
    const finalContent =
      state === CompareJudgeState.ESCALATED
        ? (judgeResult.escalatedResponse?.content ?? response.content)
        : (state === CompareJudgeState.REVISED
          ? (judgeResult.revisedResponse?.content ?? response.content)
          : response.content);

    return {
      ...response,
      content: finalContent,
      judgeEnabled: true,
      judgeModel: judgeConfig.model,
      judgeDisplayName: judgeConfig.model,
      judgeState: state,
      judgeErrorState,
      judgeDialogAvailable: judgeResult.judgeVerdict.wasFallback !== true,
      judgeReview,
    };
  }

  private resolveJudgeState(
    judgeResult: JudgeRefereeResult,
    judgeReview: JudgeReviewPayload,
    responseStatus: ParallelModelResponse['status'],
  ): CompareJudgeState {
    if (responseStatus !== 'completed') {
      return CompareJudgeState.SKIPPED;
    }

    if (judgeResult.judgeVerdict.wasFallback === true) {
      return judgeResult.judgeVerdict.fallbackState === 'failed'
        ? CompareJudgeState.FAILED
        : CompareJudgeState.UNAVAILABLE;
    }

    switch (judgeReview.judgeDecision) {
      case 'ACCEPT':
        return CompareJudgeState.VERIFIED;
      case 'REVISE':
        return CompareJudgeState.REVISED;
      case 'ESCALATE':
        return CompareJudgeState.ESCALATED;
      default:
        return CompareJudgeState.VERIFIED;
    }
  }

  private resolveJudgeErrorState(
    fallbackState: JudgeRefereeResult['judgeVerdict']['fallbackState'],
  ): CompareJudgeState | null {
    if (fallbackState === 'failed') {
      return CompareJudgeState.FAILED;
    }

    if (fallbackState === 'unavailable') {
      return CompareJudgeState.UNAVAILABLE;
    }

    return null;
  }

  private buildJudgeThreadSettings(
    threadSettings: ThreadSettings | undefined,
    judgeConfig: ParallelJudgeConfig,
  ): ThreadSettings | undefined {
    if (!judgeConfig.enabled) {
      return threadSettings;
    }

    return {
      ...threadSettings,
      judgeModel: judgeConfig.model,
    };
  }

  private async executeWithTimeout(
    target: ParallelModelTarget,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
  ): Promise<ParallelModelResponse> {
    const modelPromise = this.executeSingleModel(target, context, threadSettings);
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`Model execution timeout after ${String(this.timeoutMs)}ms`)),
        this.timeoutMs,
      );
    });

    try {
      return await Promise.race([modelPromise, timeoutPromise]);
    } catch (error: unknown) {
      const isTimeout = error instanceof Error && error.message.includes('Model execution timeout');

      if (isTimeout) {
        this.logger.warn(
          `executeWithTimeout: ${target.provider}/${target.model} timed out after ${String(this.timeoutMs)}ms`,
        );
        return this.buildTimedOutResponse(target.provider, target.model);
      }

      throw error;
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private async executeSingleModel(
    target: ParallelModelTarget,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
  ): Promise<ParallelModelResponse> {
    const modelStart = Date.now();
    this.logger.debug(`executeSingleModel: calling ${target.provider}/${target.model}`);

    try {
      const llmResponse = await this.chatExecutionManager.callProvider(
        target.provider,
        target.model,
        context,
        modelStart,
        false,
        threadSettings,
      );

      return {
        provider: llmResponse.provider,
        model: llmResponse.model,
        content: llmResponse.content,
        latencyMs: llmResponse.latencyMs,
        inputTokens: llmResponse.inputTokens ?? null,
        outputTokens: llmResponse.outputTokens ?? null,
        status: 'completed',
        errorMessage: null,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `executeSingleModel: ${target.provider}/${target.model} failed — ${errorMessage}`,
      );

      return this.buildFailedResponse(
        target.provider,
        target.model,
        errorMessage,
        Date.now() - modelStart,
      );
    }
  }

  private async storeAssistantMessages(
    threadId: string,
    parallelGroupId: string,
    responses: ParallelModelResponse[],
  ): Promise<void> {
    const storePromises = responses.map((response) =>
      this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content:
          response.status === 'completed'
            ? response.content
            : `Error: ${response.errorMessage ?? 'Unknown error'}`,
        provider: response.provider,
        model: response.model,
        inputTokens: response.inputTokens ?? undefined,
        outputTokens: response.outputTokens ?? undefined,
        latencyMs: response.latencyMs,
        usedFallback: false,
        metadata: {
          parallelExecution: true,
          parallelGroupId,
          status: response.status,
          judgeEnabled: response.judgeEnabled === true,
          judgeModel: response.judgeModel ?? null,
          judgeDisplayName: response.judgeDisplayName ?? response.judgeModel ?? null,
          judgeState: response.judgeState ?? CompareJudgeState.NONE,
          judgeErrorState: response.judgeErrorState ?? null,
          judgeDialogAvailable: response.judgeDialogAvailable === true,
          ...(response.judgeReview ? { judgeReview: response.judgeReview } : {}),
          routeRoadmap: {
            routingMode: 'MANUAL_MODEL',
            routerModel: null,
            selectedProvider: response.provider,
            selectedModel: response.model,
            finalProvider: response.provider,
            finalModel: response.model,
            finalDisplayName: response.model,
            steps: [
              {
                stage: 'tool',
                provider: 'parallel',
                model: 'parallel',
                displayName: 'Parallel compare',
                description: `Model finished with status ${response.status}`,
              },
              {
                stage: 'execution',
                provider: response.provider,
                model: response.model,
                displayName: response.model,
              },
            ],
          },
          progressSummary: [
            {
              label: 'Request accepted',
              description: 'Parallel comparison was queued.',
              actorType: 'request',
              actorName: 'Claw',
              status: 'completed',
            },
            {
              label: 'Launching comparison',
              description: 'The model finished its parallel run.',
              actorType: 'system',
              actorName: 'Parallel compare',
              status: response.status === 'completed' ? 'completed' : 'error',
            },
            {
              label: response.status === 'completed' ? 'Response complete' : 'Response failed',
              description:
                response.status === 'completed'
                  ? 'Parallel response saved to the thread.'
                  : (response.errorMessage ?? 'Parallel execution failed'),
              actorType: 'model',
              actorName: `${response.provider} / ${response.model}`,
              status: response.status === 'completed' ? 'completed' : 'error',
            },
          ],
        },
      }),
    );

    await Promise.all(storePromises);
  }

  private buildTimedOutResponse(provider: string, model: string): ParallelModelResponse {
    return {
      provider,
      model,
      content: '',
      latencyMs: this.timeoutMs,
      inputTokens: null,
      outputTokens: null,
      status: 'timeout',
      errorMessage: `Model execution timed out after ${String(this.timeoutMs)}ms`,
    };
  }

  private buildFailedResponse(
    provider: string,
    model: string,
    errorMessage: string,
    latencyMs?: number,
  ): ParallelModelResponse {
    return {
      provider,
      model,
      content: '',
      latencyMs: latencyMs ?? 0,
      inputTokens: null,
      outputTokens: null,
      status: 'failed',
      errorMessage,
    };
  }

  private extractThreadSettings(thread: ChatThread | null): ThreadSettings | undefined {
    if (!thread) {
      return undefined;
    }
    return {
      systemPrompt: thread.systemPrompt,
      temperature: thread.temperature,
      maxTokens: thread.maxTokens,
    };
  }
}
