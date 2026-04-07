import { HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService, StructuredLogger } from "@claw/shared-rabbitmq";
import { EventPattern, LogLevel } from "@claw/shared-types";
import { ChatMessagesRepository } from "../repositories/chat-messages.repository";
import { ChatThreadsRepository } from "../../chat-threads/repositories/chat-threads.repository";
import { ChatExecutionManager } from "../managers/chat-execution.manager";
import { type CreateMessageDto } from "../dto/create-message.dto";
import { type ListMessagesQueryDto } from "../dto/list-messages-query.dto";
import { type MessageRoutedData } from "../types/execution.types";
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
    const thread = await this.chatThreadsRepository.findById(dto.threadId);
    if (!thread) {
      throw new EntityNotFoundException("ChatThread", dto.threadId);
    }
    this.validateOwnership(thread, userId);

    // Resolve provider+model: per-message override → thread default → undefined (auto)
    const forcedProvider = dto.provider ?? thread.preferredProvider ?? undefined;
    const forcedModel = dto.model ?? thread.preferredModel ?? undefined;

    // If a specific model is selected, force MANUAL_MODEL routing
    const effectiveRoutingMode = forcedProvider && forcedModel
      ? RoutingMode.MANUAL_MODEL
      : dto.routingMode ?? thread.routingMode;

    const message = await this.chatMessagesRepository.create({
      threadId: dto.threadId,
      role: "USER",
      content: dto.content,
      routingMode: effectiveRoutingMode,
    });

    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `User message created in thread ${dto.threadId}`,
      action: 'message_created',
      service: ChatMessagesService.name,
      userId,
      threadId: dto.threadId,
      messageId: message.id,
    });

    void this.rabbitMQService.publish(EventPattern.MESSAGE_CREATED, {
      messageId: message.id,
      threadId: message.threadId,
      userId,
      content: message.content,
      routingMode: effectiveRoutingMode,
      forcedProvider,
      forcedModel,
      timestamp: new Date().toISOString(),
    });

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

    const threadSettings = thread
      ? {
          systemPrompt: thread.systemPrompt,
          temperature: thread.temperature,
          maxTokens: thread.maxTokens,
        }
      : undefined;

    const llmResponse = await this.chatExecutionManager.execute(payload, chronologicalMessages, threadSettings);

    const assistantMessage = await this.chatMessagesRepository.create({
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
    });

    await this.chatThreadsRepository.update(payload.threadId, {
      lastProvider: llmResponse.provider,
      lastModel: llmResponse.model,
    });

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

    void this.rabbitMQService.publish(EventPattern.MESSAGE_COMPLETED, {
      messageId: payload.messageId,
      threadId: payload.threadId,
      assistantMessageId: assistantMessage.id,
      provider: llmResponse.provider,
      model: llmResponse.model,
      inputTokens: llmResponse.inputTokens,
      outputTokens: llmResponse.outputTokens,
      latencyMs: llmResponse.latencyMs,
      timestamp: new Date().toISOString(),
    });
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
