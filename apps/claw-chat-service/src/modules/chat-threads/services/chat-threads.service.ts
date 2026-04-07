import { HttpStatus, Injectable } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { ChatThreadsRepository } from '../repositories/chat-threads.repository';
import { ChatMessagesRepository } from '../../chat-messages/repositories/chat-messages.repository';
import { type CreateThreadDto } from '../dto/create-thread.dto';
import { type UpdateThreadDto } from '../dto/update-thread.dto';
import { type ListThreadsQueryDto } from '../dto/list-threads-query.dto';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { type PaginatedResult } from '../../../common/types';
import { type ThreadWithMessageCount } from '../types/chat-threads.types';
import { type ChatThread } from '../../../generated/prisma';
import { THREAD_CREATED_EVENT } from '../constants/chat-threads.constants';

@Injectable()
export class ChatThreadsService {
  constructor(
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async createThread(userId: string, dto: CreateThreadDto): Promise<ChatThread> {
    const thread = await this.chatThreadsRepository.create({
      userId,
      title: dto.title,
      routingMode: dto.routingMode,
      systemPrompt: dto.systemPrompt,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      preferredProvider: dto.preferredProvider,
      preferredModel: dto.preferredModel,
    });

    void this.rabbitMQService.publish(THREAD_CREATED_EVENT, {
      threadId: thread.id,
      userId,
      timestamp: new Date().toISOString(),
    });

    return thread;
  }

  async getThreads(
    userId: string,
    query: ListThreadsQueryDto,
  ): Promise<PaginatedResult<ThreadWithMessageCount>> {
    const filters = {
      userId,
      search: query.search,
      isPinned: query.isPinned,
      isArchived: query.isArchived,
    };

    const [threads, total] = await Promise.all([
      this.chatThreadsRepository.findAll(
        filters,
        query.page,
        query.limit,
        query.sortBy,
        query.sortOrder,
      ),
      this.chatThreadsRepository.countAll(filters),
    ]);

    return {
      data: threads,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getThread(id: string, userId: string): Promise<ChatThread> {
    const thread = await this.chatThreadsRepository.findById(id);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', id);
    }
    this.validateOwnership(thread, userId);
    return thread;
  }

  async updateThread(id: string, userId: string, dto: UpdateThreadDto): Promise<ChatThread> {
    const thread = await this.chatThreadsRepository.findById(id);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', id);
    }
    this.validateOwnership(thread, userId);

    return this.chatThreadsRepository.update(id, {
      title: dto.title,
      isPinned: dto.isPinned,
      isArchived: dto.isArchived,
      routingMode: dto.routingMode,
      systemPrompt: dto.systemPrompt,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      preferredProvider: dto.preferredProvider,
      preferredModel: dto.preferredModel,
    });
  }

  async deleteThread(id: string, userId: string): Promise<ChatThread> {
    const thread = await this.chatThreadsRepository.findById(id);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', id);
    }
    this.validateOwnership(thread, userId);

    await this.chatMessagesRepository.deleteByThreadId(id);
    return this.chatThreadsRepository.delete(id);
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
}
