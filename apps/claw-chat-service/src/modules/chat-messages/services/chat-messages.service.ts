import { HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService, StructuredLogger } from "@claw/shared-rabbitmq";
import { EventPattern, LogLevel } from "@claw/shared-types";
import { ChatMessagesRepository } from "../repositories/chat-messages.repository";
import { ChatThreadsRepository } from "../../chat-threads/repositories/chat-threads.repository";
import { ChatExecutionManager } from "../managers/chat-execution.manager";
import { ContextAssemblyManager } from "../managers/context-assembly.manager";
import { ChatStreamController } from "../controllers/chat-stream.controller";
import { type CreateMessageDto } from "../dto/create-message.dto";
import { type ListMessagesQueryDto } from "../dto/list-messages-query.dto";
import { type LlmResponse, type MessageRoutedData, type ThreadSettings } from "../types/execution.types";
import { BusinessException, EntityNotFoundException } from "../../../common/errors";
import { type PaginatedResult } from "../../../common/types";
import { type ChatMessage, type ChatThread, RoutingMode } from "../../../generated/prisma";

@Injectable()
export class ChatMessagesService implements OnModuleInit {
  private readonly logger = new Logger(ChatMessagesService.name);
  private readonly structuredLogger: StructuredLogger;

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatExecutionManager: ChatExecutionManager,
    private readonly contextAssemblyManager: ContextAssemblyManager,
    private readonly chatStreamController: ChatStreamController,
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
    const thread = await this.getThreadForMessage(dto.threadId, userId);
    const { effectiveRoutingMode, forcedProvider, forcedModel } = this.resolveRoutingParams(dto, thread);

    const message = await this.chatMessagesRepository.create({
      threadId: dto.threadId,
      role: "USER",
      content: dto.content,
      routingMode: effectiveRoutingMode,
      metadata: this.buildMessageMetadata(dto),
    });

    this.logMessageCreated(userId, dto.threadId, message.id);
    this.publishMessageCreated(message, userId, effectiveRoutingMode, forcedProvider, forcedModel);

    return message;
  }

  async getMessages(
    threadId: string,
    userId: string,
    query: ListMessagesQueryDto,
  ): Promise<PaginatedResult<ChatMessage>> {
    const thread = await this.chatThreadsRepository.findById(threadId);
    if (!thread) {
      throw new EntityNotFoundException("ChatThread", threadId);
    }
    this.validateOwnership(thread, userId);

    const [messages, total] = await Promise.all([
      this.chatMessagesRepository.findByThreadId(threadId, query.page, query.limit),
      this.chatMessagesRepository.countByThreadId(threadId),
    ]);

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
      throw new EntityNotFoundException("ChatMessage", id);
    }

    const thread = await this.chatThreadsRepository.findById(message.threadId);
    if (!thread) {
      throw new EntityNotFoundException("ChatThread", message.threadId);
    }
    this.validateOwnership(thread, userId);

    return message;
  }

  async setFeedback(userId: string, messageId: string, feedback: string | null): Promise<ChatMessage> {
    const message = await this.chatMessagesRepository.findById(messageId);
    if (!message) {
      throw new EntityNotFoundException("ChatMessage", messageId);
    }

    const thread = await this.chatThreadsRepository.findById(message.threadId);
    if (!thread) {
      throw new EntityNotFoundException("ChatThread", message.threadId);
    }
    this.validateOwnership(thread, userId);

    return this.chatMessagesRepository.updateFeedback(messageId, feedback);
  }

  async regenerateMessage(id: string, userId: string): Promise<ChatMessage> {
    const message = await this.chatMessagesRepository.findById(id);
    if (!message) {
      throw new EntityNotFoundException("ChatMessage", id);
    }

    const thread = await this.chatThreadsRepository.findById(message.threadId);
    if (!thread) {
      throw new EntityNotFoundException("ChatThread", message.threadId);
    }
    this.validateOwnership(thread, userId);

    const regenProvider = thread.preferredProvider ?? undefined;
    const regenModel = thread.preferredModel ?? undefined;
    const regenRoutingMode = regenProvider && regenModel
      ? RoutingMode.MANUAL_MODEL
      : message.routingMode;

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
    const [threadMessages, thread] = await Promise.all([
      this.chatMessagesRepository.findRecentByThreadId(payload.threadId, 20),
      this.chatThreadsRepository.findById(payload.threadId),
    ]);

    const chronologicalMessages = [...threadMessages].reverse();
    const threadSettings = this.extractThreadSettings(thread);
    const fileIds = this.extractFileIdsFromMessages(chronologicalMessages);

    const context = await this.contextAssemblyManager.assemble(
      thread?.userId ?? "system",
      chronologicalMessages,
      threadSettings,
      thread?.contextPackIds ?? undefined,
      fileIds,
    );

    const llmResponse = await this.chatExecutionManager.execute(payload, context, threadSettings);
    const contextMetadata = {
      memoryCount: context.memories.length,
      fileIds: (fileIds ?? []),
    };
    const assistantMessage = await this.storeAssistantResponse(payload, llmResponse, contextMetadata);
    await this.updateThreadAfterResponse(payload.threadId, llmResponse);

    this.chatStreamController.emitCompletion(payload.threadId, llmResponse.provider, llmResponse.model);
    this.logAssistantResponse(payload, llmResponse);
    this.publishMessageCompleted(payload, assistantMessage, llmResponse, thread, chronologicalMessages);
  }

  private async subscribeToEvents(): Promise<void> {
    await this.rabbitMQService.subscribe(
      EventPattern.MESSAGE_ROUTED,
      async (data: unknown) => {
        await this.onMessageRouted(data);
      },
    );

    this.logger.log("Subscribed to chat execution events");
  }

  private async onMessageRouted(data: unknown): Promise<void> {
    const payload = data as Record<string, unknown>;
    const messageId = payload["messageId"] as string | undefined;
    const threadId = payload["threadId"] as string | undefined;
    const selectedProvider = payload["selectedProvider"] as string | undefined;
    const selectedModel = payload["selectedModel"] as string | undefined;
    const routingMode = payload["routingMode"] as string | undefined;
    const fallbackProvider = payload["fallbackProvider"] as string | undefined;
    const fallbackModel = payload["fallbackModel"] as string | undefined;
    const timestamp = payload["timestamp"] as string | undefined;

    if (!messageId || !threadId || !selectedProvider || !selectedModel || !routingMode) {
      this.logger.warn("Received message.routed with missing required fields");
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
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to handle message.routed for message ${messageId}: ${errorMsg}`,
      );
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
    const latestUserMsg = [...messages].reverse().find((m) => m.role === "USER");
    const metadata = latestUserMsg?.metadata as Record<string, unknown> | null;
    return Array.isArray(metadata?.["fileIds"]) ? (metadata["fileIds"] as string[]) : undefined;
  }

  private async storeAssistantResponse(
    payload: MessageRoutedData,
    llmResponse: LlmResponse,
    contextMetadata?: { memoryCount: number; fileIds: string[] },
  ): Promise<ChatMessage> {
    return this.chatMessagesRepository.create({
      threadId: payload.threadId,
      role: "ASSISTANT",
      content: llmResponse.content,
      provider: llmResponse.provider,
      model: llmResponse.model,
      routingMode: payload.routingMode as RoutingMode,
      inputTokens: llmResponse.inputTokens,
      outputTokens: llmResponse.outputTokens,
      latencyMs: llmResponse.latencyMs,
      usedFallback: llmResponse.usedFallback,
      metadata: contextMetadata ? { memoryCount: contextMetadata.memoryCount, fileIds: contextMetadata.fileIds } : undefined,
    });
  }

  private async updateThreadAfterResponse(threadId: string, llmResponse: LlmResponse): Promise<void> {
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
    });
  }

  private publishMessageCompleted(
    payload: MessageRoutedData,
    assistantMessage: ChatMessage,
    llmResponse: LlmResponse,
    thread: ChatThread | null,
    messages: ChatMessage[],
  ): void {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "USER");
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
    });
  }

  private async getThreadForMessage(threadId: string, userId: string): Promise<ChatThread> {
    const thread = await this.chatThreadsRepository.findById(threadId);
    if (!thread) {
      throw new EntityNotFoundException("ChatThread", threadId);
    }
    this.validateOwnership(thread, userId);
    return thread;
  }

  private resolveRoutingParams(
    dto: CreateMessageDto,
    thread: ChatThread,
  ): { effectiveRoutingMode: RoutingMode; forcedProvider: string | undefined; forcedModel: string | undefined } {
    const forcedProvider = dto.provider ?? thread.preferredProvider ?? undefined;
    const forcedModel = dto.model ?? thread.preferredModel ?? undefined;

    const effectiveRoutingMode = forcedProvider && forcedModel
      ? RoutingMode.MANUAL_MODEL
      : dto.routingMode ?? thread.routingMode;

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
        "You do not have access to this thread",
        "FORBIDDEN_THREAD_ACCESS",
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
