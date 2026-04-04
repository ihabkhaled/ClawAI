import { HttpStatus, Injectable } from "@nestjs/common";
import { RabbitMQService } from "@claw/shared-rabbitmq";
import { EventPattern } from "@claw/shared-types";
import { ChatMessagesRepository } from "../repositories/chat-messages.repository";
import { ChatThreadsRepository } from "../../chat-threads/repositories/chat-threads.repository";
import { type CreateMessageDto } from "../dto/create-message.dto";
import { type ListMessagesQueryDto } from "../dto/list-messages-query.dto";
import { BusinessException, EntityNotFoundException } from "../../../common/errors";
import { type PaginatedResult } from "../../../common/types";
import { type ChatMessage, type ChatThread } from "../../../generated/prisma";

@Injectable()
export class ChatMessagesService {
  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

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
