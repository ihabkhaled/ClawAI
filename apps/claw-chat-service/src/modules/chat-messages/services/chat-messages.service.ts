import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService, StructuredLogger } from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel } from '@claw/shared-types';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatExecutionManager } from '../managers/chat-execution.manager';
import { ContextAssemblyManager } from '../managers/context-assembly.manager';
import { ParallelExecutionManager } from '../managers/parallel-execution.manager';
import { ChatStreamService } from './chat-stream.service';
import { type CreateMessageDto } from '../dto/create-message.dto';
import { type ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import {
  type LlmResponse,
  type MessageRoutedData,
  type ThreadSettings,
} from '../types/execution.types';
import { type ParallelResponse } from '../types/parallel.types';
import { type ParallelMessageDto } from '../dto/parallel-message.dto';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { type PaginatedResult } from '../../../common/types';
import { type ChatMessage, type ChatThread, RoutingMode } from '../../../generated/prisma';

@Injectable()
export class ChatMessagesService implements OnModuleInit {
  private readonly logger = new Logger(ChatMessagesService.name);
  private readonly structuredLogger: StructuredLogger;

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatExecutionManager: ChatExecutionManager,
    private readonly contextAssemblyManager: ContextAssemblyManager,
    private readonly parallelExecutionManager: ParallelExecutionManager,
    private readonly chatStreamService: ChatStreamService,
    private readonly rabbitMQService: RabbitMQService,
  ) {
    this.structuredLogger = new StructuredLogger(
      this.rabbitMQService,
      'chat-service',
      EventPattern.LOG_SERVER,
      ChatMessagesService.name,
    );
  }

  async onModuleInit(): Promise<void> {
    await this.subscribeToEvents();
  }

  async createMessage(userId: string, dto: CreateMessageDto): Promise<ChatMessage> {
    this.logger.log(`createMessage: starting for user ${userId} in thread ${dto.threadId}`);
    const thread = await this.getThreadForMessage(dto.threadId, userId);
    const { effectiveRoutingMode, forcedProvider, forcedModel } = this.resolveRoutingParams(
      dto,
      thread,
    );

    this.logger.debug(
      `createMessage: resolved routing mode=${effectiveRoutingMode}, provider=${forcedProvider ?? 'auto'}, model=${forcedModel ?? 'auto'}`,
    );

    const message = await this.chatMessagesRepository.create({
      threadId: dto.threadId,
      role: 'USER',
      content: dto.content,
      routingMode: effectiveRoutingMode,
      metadata: this.buildMessageMetadata(dto),
    });

    this.logger.log(`createMessage: created message ${message.id} in thread ${dto.threadId}`);
    this.logMessageCreated(userId, dto.threadId, message.id);
    this.publishMessageCreated(message, userId, effectiveRoutingMode, forcedProvider, forcedModel);

    return message;
  }

  async createParallelMessage(userId: string, dto: ParallelMessageDto): Promise<ParallelResponse> {
    const thread = await this.getThreadForMessage(dto.threadId, userId);

    return this.parallelExecutionManager.executeParallel(
      userId,
      thread.id,
      dto.content,
      dto.models,
      dto.fileIds,
    );
  }

  async getMessages(
    threadId: string,
    userId: string,
    query: ListMessagesQueryDto,
  ): Promise<PaginatedResult<ChatMessage>> {
    this.logger.debug(
      `getMessages: fetching thread ${threadId} page=${String(query.page)} limit=${String(query.limit)}`,
    );
    const thread = await this.chatThreadsRepository.findById(threadId);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', threadId);
    }
    this.validateOwnership(thread, userId);

    const [messages, total] = await Promise.all([
      this.chatMessagesRepository.findByThreadId(threadId, query.page, query.limit),
      this.chatMessagesRepository.countByThreadId(threadId),
    ]);

    this.logger.debug(
      `getMessages: returned ${String(messages.length)} of ${String(total)} messages for thread ${threadId}`,
    );

    return {
      data: messages,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getMessage(id: string, userId: string): Promise<ChatMessage> {
    const message = await this.chatMessagesRepository.findById(id);
    if (!message) {
      throw new EntityNotFoundException('ChatMessage', id);
    }

    const thread = await this.chatThreadsRepository.findById(message.threadId);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', message.threadId);
    }
    this.validateOwnership(thread, userId);

    return message;
  }

  async setFeedback(
    userId: string,
    messageId: string,
    feedback: string | null,
  ): Promise<ChatMessage> {
    this.logger.log(
      `setFeedback: setting feedback="${feedback ?? 'null'}" on message ${messageId}`,
    );
    const message = await this.chatMessagesRepository.findById(messageId);
    if (!message) {
      throw new EntityNotFoundException('ChatMessage', messageId);
    }

    const thread = await this.chatThreadsRepository.findById(message.threadId);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', message.threadId);
    }
    this.validateOwnership(thread, userId);

    const updated = await this.chatMessagesRepository.updateFeedback(messageId, feedback);
    this.logger.log(`setFeedback: completed for message ${messageId}`);
    return updated;
  }

  async regenerateMessage(id: string, userId: string): Promise<ChatMessage> {
    this.logger.log(`regenerateMessage: starting for message ${id} by user ${userId}`);
    const message = await this.chatMessagesRepository.findById(id);
    if (!message) {
      throw new EntityNotFoundException('ChatMessage', id);
    }

    const thread = await this.chatThreadsRepository.findById(message.threadId);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', message.threadId);
    }
    this.validateOwnership(thread, userId);

    const regenProvider = thread.preferredProvider ?? undefined;
    const regenModel = thread.preferredModel ?? undefined;
    const regenRoutingMode =
      regenProvider && regenModel ? RoutingMode.MANUAL_MODEL : message.routingMode;

    this.logger.log(
      `regenerateMessage: publishing message.created for regeneration of ${id} with mode=${regenRoutingMode}`,
    );
    void this.rabbitMQService.publish(EventPattern.MESSAGE_CREATED, {
      messageId: message.id,
      threadId: message.threadId,
      userId,
      content: message.content,
      routingMode: regenRoutingMode,
      forcedProvider: regenProvider,
      forcedModel: regenModel,
      regenerate: true,
      timestamp: new Date().toISOString(),
    });

    return message;
  }

  async handleMessageRouted(payload: MessageRoutedData): Promise<void> {
    this.logger.log(
      `handleMessageRouted: starting for message ${payload.messageId} via ${payload.selectedProvider}/${payload.selectedModel}`,
    );
    const [threadMessages, thread] = await Promise.all([
      this.chatMessagesRepository.findRecentByThreadId(payload.threadId, 20),
      this.chatThreadsRepository.findById(payload.threadId),
    ]);

    const chronologicalMessages = [...threadMessages].reverse();
    const threadSettings = this.extractThreadSettings(thread);
    const fileIds = this.extractFileIdsFromMessages(chronologicalMessages);

    // Context-aware follow-up detection:
    // If user says "again"/"one more" and the last message was image/file generation,
    // override routing to re-trigger the same generation type
    let effectivePayload = this.detectImageFollowUp(payload, thread, chronologicalMessages);
    effectivePayload = this.detectFileGenerationFollowUp(
      effectivePayload,
      thread,
      chronologicalMessages,
    );

    // Attachment-aware image generation detection:
    // If user attached IMAGE files and text implies "similar/recreate/like this",
    // override to IMAGE_GEMINI even if router didn't detect it
    effectivePayload = this.detectImageFromAttachment(effectivePayload, chronologicalMessages);

    this.logger.debug(
      `handleMessageRouted: assembling context with ${String(chronologicalMessages.length)} messages, fileIds=${String(fileIds?.length ?? 0)}`,
    );
    const context = await this.contextAssemblyManager.assemble(
      thread?.userId ?? 'system',
      chronologicalMessages,
      threadSettings,
      thread?.contextPackIds ?? undefined,
      fileIds,
    );

    this.logger.debug(
      `handleMessageRouted: calling LLM execution for ${effectivePayload.selectedProvider}/${effectivePayload.selectedModel}`,
    );
    try {
      const llmResponse = await this.chatExecutionManager.execute(
        effectivePayload,
        context,
        threadSettings,
      );
      const contextMetadata = {
        memoryCount: context.memories.length,
        fileIds: fileIds ?? [],
      };
      const assistantMessage = await this.storeAssistantResponse(
        payload,
        llmResponse,
        contextMetadata,
      );
      await this.updateThreadAfterResponse(payload.threadId, llmResponse);

      this.chatStreamService.emitCompletion(
        payload.threadId,
        llmResponse.provider,
        llmResponse.model,
      );
      this.logAssistantResponse(payload, llmResponse);
      this.publishMessageCompleted(
        payload,
        assistantMessage,
        llmResponse,
        thread,
        chronologicalMessages,
      );
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'All providers failed';
      this.logger.error(
        `handleMessageRouted: failed for message ${payload.messageId} - ${errorMsg}`,
      );
      await this.storeErrorResponse(payload, errorMsg);
      throw error;
    }
  }

  private async subscribeToEvents(): Promise<void> {
    await this.rabbitMQService.subscribe(EventPattern.MESSAGE_ROUTED, async (data: unknown) => {
      await this.onMessageRouted(data);
    });

    this.logger.log('Subscribed to chat execution events');
  }

  private async onMessageRouted(data: unknown): Promise<void> {
    const payload = data as Record<string, unknown>;
    const messageId = payload['messageId'] as string | undefined;
    const threadId = payload['threadId'] as string | undefined;
    const selectedProvider = payload['selectedProvider'] as string | undefined;
    const selectedModel = payload['selectedModel'] as string | undefined;
    const routingMode = payload['routingMode'] as string | undefined;
    const fallbackProvider = payload['fallbackProvider'] as string | undefined;
    const fallbackModel = payload['fallbackModel'] as string | undefined;
    const timestamp = payload['timestamp'] as string | undefined;

    if (!messageId || !threadId || !selectedProvider || !selectedModel || !routingMode) {
      this.logger.warn('Received message.routed with missing required fields');
      return;
    }

    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Received routed message for ${messageId} via ${selectedProvider}/${selectedModel}`,
      action: 'message_routed_received',
      service: ChatMessagesService.name,
      messageId,
      threadId,
      provider: selectedProvider,
      model: selectedModel,
    });

    try {
      await this.handleMessageRouted({
        messageId,
        threadId,
        selectedProvider,
        selectedModel,
        routingMode,
        fallbackProvider,
        fallbackModel,
        timestamp: timestamp ?? new Date().toISOString(),
      });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to handle message.routed for message ${messageId}: ${errorMsg}`);
      this.structuredLogger.logAction({
        level: LogLevel.ERROR,
        message: `Failed to handle message.routed for message ${messageId}`,
        action: 'message_routed_error',
        service: ChatMessagesService.name,
        messageId,
        threadId,
        errorMessage: errorMsg,
      });
    }
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

  private extractFileIdsFromMessages(messages: ChatMessage[]): string[] | undefined {
    const latestUserMsg = [...messages].reverse().find((m) => m.role === 'USER');
    const metadata = latestUserMsg?.metadata as Record<string, unknown> | null;
    return Array.isArray(metadata?.['fileIds']) ? (metadata['fileIds'] as string[]) : undefined;
  }

  private async storeErrorResponse(payload: MessageRoutedData, errorMsg: string): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId: payload.threadId,
      role: 'ASSISTANT',
      content: `⚠️ ${errorMsg}`,
      provider: payload.selectedProvider,
      model: payload.selectedModel,
      routingMode: payload.routingMode as RoutingMode,
      usedFallback: true,
      metadata: { error: true },
    });
  }

  private async storeAssistantResponse(
    payload: MessageRoutedData,
    llmResponse: LlmResponse,
    contextMetadata?: { memoryCount: number; fileIds: string[] },
  ): Promise<ChatMessage> {
    return this.chatMessagesRepository.create({
      threadId: payload.threadId,
      role: 'ASSISTANT',
      content: llmResponse.content,
      provider: llmResponse.provider,
      model: llmResponse.model,
      routingMode: payload.routingMode as RoutingMode,
      inputTokens: llmResponse.inputTokens,
      outputTokens: llmResponse.outputTokens,
      latencyMs: llmResponse.latencyMs,
      usedFallback: llmResponse.usedFallback,
      metadata: {
        ...(contextMetadata
          ? { memoryCount: contextMetadata.memoryCount, fileIds: contextMetadata.fileIds }
          : {}),
        ...(llmResponse.imageGenerationId
          ? { type: 'image_generation', generationId: llmResponse.imageGenerationId }
          : {}),
        ...(llmResponse.fileGenerationId
          ? { type: 'file_generation', generationId: llmResponse.fileGenerationId }
          : {}),
        ...(llmResponse.reRouted
          ? {
              reRouted: true,
              originalProvider: llmResponse.originalProvider,
              originalModel: llmResponse.originalModel,
              originalScore: llmResponse.originalScore,
              reRouteAttempts: llmResponse.reRouteAttempts,
            }
          : {}),
      },
    });
  }

  private async updateThreadAfterResponse(
    threadId: string,
    llmResponse: LlmResponse,
  ): Promise<void> {
    await this.chatThreadsRepository.update(threadId, {
      lastProvider: llmResponse.provider,
      lastModel: llmResponse.model,
    });
  }

  private logAssistantResponse(payload: MessageRoutedData, llmResponse: LlmResponse): void {
    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Assistant response stored for message ${payload.messageId}`,
      action: 'assistant_response_stored',
      service: ChatMessagesService.name,
      messageId: payload.messageId,
      threadId: payload.threadId,
      provider: llmResponse.provider,
      model: llmResponse.model,
      latencyMs: llmResponse.latencyMs,
      ...(llmResponse.reRouted
        ? {
            reRouted: true,
            originalProvider: llmResponse.originalProvider,
            originalModel: llmResponse.originalModel,
            originalScore: llmResponse.originalScore,
            reRouteAttempts: llmResponse.reRouteAttempts,
          }
        : {}),
    });
  }

  private publishMessageCompleted(
    payload: MessageRoutedData,
    assistantMessage: ChatMessage,
    llmResponse: LlmResponse,
    thread: ChatThread | null,
    messages: ChatMessage[],
  ): void {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'USER');
    void this.rabbitMQService.publish(EventPattern.MESSAGE_COMPLETED, {
      messageId: payload.messageId,
      threadId: payload.threadId,
      assistantMessageId: assistantMessage.id,
      userId: thread?.userId,
      provider: llmResponse.provider,
      model: llmResponse.model,
      inputTokens: llmResponse.inputTokens,
      outputTokens: llmResponse.outputTokens,
      latencyMs: llmResponse.latencyMs,
      content: llmResponse.content,
      userContent: lastUserMsg?.content,
      timestamp: new Date().toISOString(),
      ...(llmResponse.reRouted
        ? {
            reRouted: true,
            originalProvider: llmResponse.originalProvider,
            originalModel: llmResponse.originalModel,
            reRouteAttempts: llmResponse.reRouteAttempts,
          }
        : {}),
    });
  }

  private async getThreadForMessage(threadId: string, userId: string): Promise<ChatThread> {
    const thread = await this.chatThreadsRepository.findById(threadId);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', threadId);
    }
    this.validateOwnership(thread, userId);
    return thread;
  }

  private resolveRoutingParams(
    dto: CreateMessageDto,
    thread: ChatThread,
  ): {
    effectiveRoutingMode: RoutingMode;
    forcedProvider: string | undefined;
    forcedModel: string | undefined;
  } {
    const forcedProvider = dto.provider ?? thread.preferredProvider ?? undefined;
    const forcedModel = dto.model ?? thread.preferredModel ?? undefined;

    const effectiveRoutingMode =
      forcedProvider && forcedModel
        ? RoutingMode.MANUAL_MODEL
        : (dto.routingMode ?? thread.routingMode);

    return { effectiveRoutingMode, forcedProvider, forcedModel };
  }

  private buildMessageMetadata(dto: CreateMessageDto): { fileIds: string[] } | undefined {
    if (dto.fileIds && dto.fileIds.length > 0) {
      return { fileIds: dto.fileIds };
    }
    return undefined;
  }

  private logMessageCreated(userId: string, threadId: string, messageId: string): void {
    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `User message created in thread ${threadId}`,
      action: 'message_created',
      service: ChatMessagesService.name,
      userId,
      threadId,
      messageId,
    });
  }

  private publishMessageCreated(
    message: ChatMessage,
    userId: string,
    routingMode: RoutingMode,
    forcedProvider: string | undefined,
    forcedModel: string | undefined,
  ): void {
    void this.rabbitMQService.publish(EventPattern.MESSAGE_CREATED, {
      messageId: message.id,
      threadId: message.threadId,
      userId,
      content: message.content,
      routingMode,
      forcedProvider,
      forcedModel,
      timestamp: new Date().toISOString(),
    });
  }

  private validateOwnership(thread: ChatThread, userId: string): void {
    if (thread.userId !== userId) {
      throw new BusinessException(
        'You do not have access to this thread',
        'FORBIDDEN_THREAD_ACCESS',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private detectImageFollowUp(
    payload: MessageRoutedData,
    thread: ChatThread | null,
    messages: ChatMessage[],
  ): MessageRoutedData {
    // Only override AUTO routing — don't interfere with manual model selection
    if (payload.routingMode !== 'AUTO') {
      return payload;
    }

    // Already routed to image provider — no override needed
    if (payload.selectedProvider.startsWith('IMAGE_')) {
      return payload;
    }

    // Check if thread's last interaction was image generation
    const lastProvider = thread?.lastProvider;
    if (!lastProvider?.startsWith('IMAGE_')) {
      return payload;
    }

    // Check if user's message is a short follow-up
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'USER');
    if (!lastUserMsg) {
      return payload;
    }

    const lower = lastUserMsg.content.toLowerCase().trim();
    const isFollowUp =
      lower.length < 100 &&
      (lower === 'again' ||
        lower === 'one more' ||
        lower === 'another one' ||
        lower === 'do it again' ||
        lower === 'retry' ||
        lower === 'regenerate' ||
        lower === 'redo' ||
        lower === 'more' ||
        lower.startsWith('another') ||
        lower.startsWith('one more') ||
        lower.startsWith('do another') ||
        lower.startsWith('make another') ||
        lower.startsWith('generate another') ||
        lower.startsWith('create another'));

    if (!isFollowUp) {
      return payload;
    }

    // Find the original image prompt from the last image generation message
    const lastImageMsg = [...messages].reverse().find((m) => {
      const meta = m.metadata as Record<string, unknown> | null;
      return meta?.['type'] === 'image_generation';
    });

    // Override routing to use the same image provider
    this.logger.log(
      `Context follow-up detected: "${lower}" → re-routing to ${lastProvider}/${thread?.lastModel ?? 'default'}`,
    );

    return {
      ...payload,
      selectedProvider: lastProvider,
      selectedModel: thread?.lastModel ?? payload.selectedModel,
      routingMode: payload.routingMode,
      fallbackProvider: lastImageMsg ? undefined : payload.fallbackProvider,
      fallbackModel: lastImageMsg ? undefined : payload.fallbackModel,
    };
  }

  private detectFileGenerationFollowUp(
    payload: MessageRoutedData,
    _thread: ChatThread | null,
    messages: ChatMessage[],
  ): MessageRoutedData {
    if (payload.routingMode !== 'AUTO') {
      return payload;
    }
    if (payload.selectedProvider === 'FILE_GENERATION') {
      return payload;
    }

    // Check if last assistant message was file generation
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'ASSISTANT');
    const meta = lastAssistant?.metadata as Record<string, unknown> | null;
    if (meta?.['type'] !== 'file_generation') {
      return payload;
    }

    // Check for short follow-up
    const lastUser = [...messages].reverse().find((m) => m.role === 'USER');
    if (!lastUser) {
      return payload;
    }
    const lower = lastUser.content.toLowerCase().trim();
    const isFollowUp =
      lower.length < 100 &&
      (lower === 'again' ||
        lower === 'one more' ||
        lower === 'another one' ||
        lower === 'do it again' ||
        lower === 'retry' ||
        lower === 'regenerate' ||
        lower === 'redo' ||
        lower === 'more' ||
        lower.startsWith('another') ||
        lower.startsWith('one more') ||
        lower.startsWith('do another'));

    if (!isFollowUp) {
      return payload;
    }

    this.logger.log(
      `File generation follow-up detected: "${lower}" → re-routing to FILE_GENERATION`,
    );

    return {
      ...payload,
      selectedProvider: 'FILE_GENERATION',
      selectedModel: 'auto',
    };
  }

  private detectImageFromAttachment(
    payload: MessageRoutedData,
    messages: ChatMessage[],
  ): MessageRoutedData {
    // Already routed to image generation
    if (payload.selectedProvider.startsWith('IMAGE_')) {
      return payload;
    }

    // Check if the latest user message has image attachments
    const lastUser = [...messages].reverse().find((m) => m.role === 'USER');
    if (!lastUser) {
      return payload;
    }

    const meta = lastUser.metadata as Record<string, unknown> | null;
    const fileIds = Array.isArray(meta?.['fileIds']) ? (meta['fileIds'] as string[]) : [];
    if (fileIds.length === 0) {
      return payload;
    }

    // Check if the user's text implies they want image generation from the attachment
    const lower = lastUser.content.toLowerCase();
    const imageIntentPhrases = [
      'similar',
      'like this',
      'recreate',
      'reproduce',
      'copy',
      'same style',
      'identical',
      'match',
      'imitate',
      'version of this',
      'based on this',
      'inspired by',
      'variation',
      'modify this',
      'edit this',
      'change this',
      'transform this',
      'convert this',
      'make this',
      'redo this',
      'similar to this',
      'like the attached',
      'same as this',
      'generate from this',
      'create from this',
      'remake',
      'generate similar',
      'create similar',
      'generate like',
      'looks like this',
      'style of this',
      'another like this',
      'one more like',
      'same kind',
      'same type',
      'replicate',
    ];

    const hasImageIntent = imageIntentPhrases.some((p) => lower.includes(p));
    if (!hasImageIntent) {
      return payload;
    }

    this.logger.log(
      `Image-from-attachment detected: "${lower.slice(0, 50)}" with ${String(fileIds.length)} files → overriding to IMAGE_GEMINI`,
    );

    return {
      ...payload,
      selectedProvider: 'IMAGE_GEMINI',
      selectedModel: 'gemini-2.5-flash-image',
    };
  }
}
