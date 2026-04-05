import { HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "@claw/shared-rabbitmq";
import { EventPattern } from "@claw/shared-types";
import { ChatMessagesRepository } from "../repositories/chat-messages.repository";
import { ChatThreadsRepository } from "../../chat-threads/repositories/chat-threads.repository";
import { ChatExecutionManager } from "../managers/chat-execution.manager";
import { type CreateMessageDto } from "../dto/create-message.dto";
import { type ListMessagesQueryDto } from "../dto/list-messages-query.dto";
import { type MessageRoutedData } from "../types/execution.types";
import { BusinessException, EntityNotFoundException } from "../../../common/errors";
import { type PaginatedResult } from "../../../common/types";
import { type ChatMessage, type ChatThread, type RoutingMode } from "../../../generated/prisma";

@Injectable()
export class ChatMessagesService implements OnModuleInit {
  private readonly logger = new Logger(ChatMessagesService.name);

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatExecutionManager: ChatExecutionManager,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.subscribeToEvents();
  }

  async createMessage(userId: string, dto: CreateMessageDto): Promise<ChatMessage> {
    const thread = await this.chatThreadsRepository.findById(dto.threadId);
    if (!thread) {
      throw new EntityNotFoundException("ChatThread", dto.threadId);
    }
    this.validateOwnership(thread, userId);

    const message = await this.chatMessagesRepository.create({
      threadId: dto.threadId,
      role: "USER",
      content: dto.content,
      routingMode: dto.routingMode,
    });

    void this.rabbitMQService.publish(EventPattern.MESSAGE_CREATED, {
      messageId: message.id,
      threadId: message.threadId,
      userId,
      content: message.content,
      routingMode: dto.routingMode,
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

    void this.rabbitMQService.publish(EventPattern.MESSAGE_CREATED, {
      messageId: message.id,
      threadId: message.threadId,
      userId,
      content: message.content,
      routingMode: message.routingMode,
      regenerate: true,
      timestamp: new Date().toISOString(),
    });

    return message;
  }

  async handleMessageRouted(payload: MessageRoutedData): Promise<void> {
    const threadMessages = await this.chatMessagesRepository.findRecentByThreadId(
      payload.threadId,
      20,
    );

    const chronologicalMessages = [...threadMessages].reverse();

    const llmResponse = await this.chatExecutionManager.execute(payload, chronologicalMessages);

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
