import { Injectable, Logger } from '@nestjs/common';
import { ProgressActorType, StreamEventType } from '../../../common/enums';
import { ChatExecutionManager } from './chat-execution.manager';
import { ContextAssemblyManager } from './context-assembly.manager';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import {
  type ParallelModelResponse,
  type ParallelModelTarget,
  type ParallelResponse,
} from '../types/parallel.types';
import { type ThreadSettings } from '../types/execution.types';
import { type AssembledContext } from '../types/context.types';
import { type ChatThread } from '../../../generated/prisma';
import { AppConfig } from '../../../app/config/app.config';

@Injectable()
export class ParallelExecutionManager {
  private readonly logger = new Logger(ParallelExecutionManager.name);
  private readonly timeoutMs: number;

  constructor(
    private readonly chatExecutionManager: ChatExecutionManager,
    private readonly contextAssemblyManager: ContextAssemblyManager,
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
    fileIds?: string[],
  ): Promise<ParallelResponse> {
    this.logger.log(
      `executeParallel: queuing ${String(models.length)} models in thread ${threadId}`,
    );
    this.chatStreamService.emitRequestAccepted(threadId);

    const userMessage = await this.storeUserMessage(threadId, content, fileIds);

    void this.executeInBackground(userId, threadId, userMessage.id, models, fileIds);

    return {
      messageId: userMessage.id,
      threadId,
      prompt: content,
      responses: [],
      totalLatencyMs: 0,
      completedCount: 0,
      failedCount: 0,
    };
  }

  private async executeInBackground(
    userId: string,
    threadId: string,
    parallelGroupId: string,
    models: ParallelModelTarget[],
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
      const responses = await this.executeAllModels(models, context, threadSettings);
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
        this.buildFailedResponse('system', 'parallel', `Parallel execution failed: ${msg}`),
      ]);
      this.chatStreamService.emitError(threadId, `Parallel execution failed: ${msg}`);
    }
  }

  private async storeUserMessage(
    threadId: string,
    content: string,
    fileIds?: string[],
  ): Promise<{ id: string }> {
    const metadata = fileIds && fileIds.length > 0 ? { fileIds } : undefined;

    return this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content,
      metadata,
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
  ): Promise<ParallelModelResponse[]> {
    const promises = models.map((target) =>
      this.executeWithTimeout(target, context, threadSettings),
    );

    const settled = await Promise.allSettled(promises);

    return settled.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }

      const target = models[index];
      return this.buildFailedResponse(
        target?.provider ?? 'unknown',
        target?.model ?? 'unknown',
        result.reason instanceof Error ? result.reason.message : 'Promise rejected',
      );
    });
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
