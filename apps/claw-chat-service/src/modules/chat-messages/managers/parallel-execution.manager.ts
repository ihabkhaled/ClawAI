import { Injectable, Logger } from '@nestjs/common';
import { ChatExecutionManager } from './chat-execution.manager';
import { ContextAssemblyManager } from './context-assembly.manager';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import {
  type ParallelModelResponse,
  type ParallelModelTarget,
  type ParallelResponse,
} from '../types/parallel.types';
import { type ThreadSettings } from '../types/execution.types';
import { type AssembledContext } from '../types/context.types';
import { type ChatThread } from '../../../generated/prisma';

@Injectable()
export class ParallelExecutionManager {
  private readonly logger = new Logger(ParallelExecutionManager.name);

  constructor(
    private readonly chatExecutionManager: ChatExecutionManager,
    private readonly contextAssemblyManager: ContextAssemblyManager,
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
  ) {}

  async executeParallel(
    userId: string,
    threadId: string,
    content: string,
    models: ParallelModelTarget[],
    fileIds?: string[],
  ): Promise<ParallelResponse> {
    const startTime = Date.now();
    this.logger.log(`executeParallel: starting for ${String(models.length)} models in thread ${threadId}`);

    const userMessage = await this.storeUserMessage(threadId, content, fileIds);
    const { context, threadSettings } = await this.buildContext(userId, threadId, fileIds);

    const responses = await this.executeAllModels(models, context, threadSettings);
    await this.storeAssistantMessages(threadId, responses);

    return this.buildParallelResponse(userMessage.id, threadId, content, responses, startTime);
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
      this.executeSingleModel(target, context, threadSettings),
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
      this.logger.warn(`executeSingleModel: ${target.provider}/${target.model} failed — ${errorMessage}`);

      return this.buildFailedResponse(target.provider, target.model, errorMessage, Date.now() - modelStart);
    }
  }

  private async storeAssistantMessages(
    threadId: string,
    responses: ParallelModelResponse[],
  ): Promise<void> {
    const storePromises = responses.map((response) =>
      this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: response.status === 'completed' ? response.content : `Error: ${response.errorMessage ?? 'Unknown error'}`,
        provider: response.provider,
        model: response.model,
        inputTokens: response.inputTokens ?? undefined,
        outputTokens: response.outputTokens ?? undefined,
        latencyMs: response.latencyMs,
        usedFallback: false,
        metadata: { parallelExecution: true, status: response.status },
      }),
    );

    await Promise.all(storePromises);
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

  private buildParallelResponse(
    messageId: string,
    threadId: string,
    prompt: string,
    responses: ParallelModelResponse[],
    startTime: number,
  ): ParallelResponse {
    const completedCount = responses.filter((r) => r.status === 'completed').length;
    const failedCount = responses.filter((r) => r.status !== 'completed').length;

    this.logger.log(
      `executeParallel: completed — ${String(completedCount)} succeeded, ${String(failedCount)} failed, totalMs=${String(Date.now() - startTime)}`,
    );

    return {
      messageId,
      threadId,
      prompt,
      responses,
      totalLatencyMs: Date.now() - startTime,
      completedCount,
      failedCount,
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
