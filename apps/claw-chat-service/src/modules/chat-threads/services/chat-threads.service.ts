import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { resolvePlanLimit } from '@claw/shared-entitlements';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
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
import { DailyLimitService } from '../../chat-messages/services/daily-limit.service';
import { copyThreadSettings } from '../utilities/copy-thread-settings.utility';

@Injectable()
export class ChatThreadsService {
  private readonly logger = new Logger(ChatThreadsService.name);

  constructor(
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly rabbitMQService: RabbitMQService,
    private readonly dailyLimitService: DailyLimitService,
  ) {}

  async createThread(userId: string, dto: CreateThreadDto): Promise<ChatThread> {
    this.logger.log(
      `createThread: creating thread for user ${userId} with mode=${dto.routingMode ?? 'default'}`,
    );
    const entitlements = await this.dailyLimitService.resolve(userId);
    const thread = await this.chatThreadsRepository.createWithinDailyLimit(
      {
        userId,
        title: dto.title,
        routingMode: dto.routingMode,
        systemPrompt: dto.systemPrompt,
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        preferredProvider: dto.preferredProvider,
        preferredModel: dto.preferredModel,
        contextPackIds: dto.contextPackIds,
        useCrossThreadContext: dto.useCrossThreadContext,
      },
      resolvePlanLimit(entitlements, (limits) => limits.chatsPerDay),
    );
    if (!thread) {
      throw new BusinessException(
        'Daily chat limit exceeded',
        'PLAN_DAILY_CHAT_LIMIT_EXCEEDED',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.logger.log(`createThread: created thread ${thread.id} for user ${userId}`);
    void this.rabbitMQService.publish(THREAD_CREATED_EVENT, {
      threadId: thread.id,
      userId,
      timestamp: new Date().toISOString(),
    });

    return thread;
  }

  /**
   * Copies a conversation up to one message into a new thread.
   *
   * The point is to try a different direction without losing the one you have.
   * Editing a prompt truncates the thread it belongs to; branching leaves the
   * original untouched and explores beside it.
   *
   * Counted against the daily chat ceiling like any other new thread — a branch
   * is a thread, and exempting it would make branching the way around the
   * limit.
   */
  async branchThread(userId: string, threadId: string, fromMessageId: string): Promise<ChatThread> {
    const source = await this.chatThreadsRepository.findById(threadId);
    if (!source) {
      throw new EntityNotFoundException('ChatThread', threadId);
    }
    this.validateOwnership(source, userId);

    const pivot = await this.chatMessagesRepository.findById(fromMessageId);
    // One expression covers both "no such message" and "a message from another
    // conversation" — the second is what stops one thread's history being
    // grafted onto another.
    if (pivot?.threadId !== threadId) {
      throw new EntityNotFoundException('ChatMessage', fromMessageId);
    }

    const entitlements = await this.dailyLimitService.resolve(userId);
    const branch = await this.chatThreadsRepository.createBranchWithinDailyLimit(
      // The branch is the same conversation up to this point, so it carries the
      // same name and settings. An untitled source stays untitled and the branch
      // names itself from its own first message, which is that same message.
      { userId, ...copyThreadSettings(source) },
      resolvePlanLimit(entitlements, (limits) => limits.chatsPerDay),
      threadId,
      pivot.createdAt,
    );
    if (!branch) {
      throw new BusinessException(
        'Daily chat limit exceeded',
        'PLAN_DAILY_CHAT_LIMIT_EXCEEDED',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.logger.log(`branchThread: ${threadId} -> ${branch.id} at message ${fromMessageId}`);
    void this.rabbitMQService.publish(THREAD_CREATED_EVENT, {
      threadId: branch.id,
      userId,
      timestamp: new Date().toISOString(),
    });

    return branch;
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
    this.logger.log(`updateThread: updating thread ${id}`);
    const thread = await this.chatThreadsRepository.findById(id);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', id);
    }
    this.validateOwnership(thread, userId);

    const updated = await this.chatThreadsRepository.update(id, {
      title: dto.title,
      isPinned: dto.isPinned,
      isArchived: dto.isArchived,
      routingMode: dto.routingMode,
      systemPrompt: dto.systemPrompt,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      preferredProvider: dto.preferredProvider,
      preferredModel: dto.preferredModel,
      contextPackIds: dto.contextPackIds,
      judgeEnabled: dto.judgeEnabled,
      judgeModel: dto.judgeModel,
      criticEnabled:
        (dto.judgeEnabled ?? thread.judgeEnabled) === false ? false : dto.criticEnabled,
      criticModel:
        (dto.judgeEnabled ?? thread.judgeEnabled) === false ||
        (dto.criticEnabled ?? thread.criticEnabled) === false
          ? null
          : dto.criticModel,
      qualityThreshold: dto.qualityThreshold,
      maxReRouteAttempts: dto.maxReRouteAttempts,
      useMemory: dto.useMemory,
      useContext: dto.useContext,
      useCrossThreadContext: dto.useCrossThreadContext,
    });
    if (dto.useMemory !== undefined && dto.useMemory !== thread.useMemory) {
      void this.rabbitMQService.publish(EventPattern.CHAT_THREAD_MEMORY_TOGGLED, {
        threadId: id,
        userId,
        useMemory: dto.useMemory,
        timestamp: new Date().toISOString(),
      });
    }
    if (dto.useContext !== undefined && dto.useContext !== thread.useContext) {
      void this.rabbitMQService.publish(EventPattern.CHAT_THREAD_CONTEXT_TOGGLED, {
        threadId: id,
        userId,
        useContext: dto.useContext,
        timestamp: new Date().toISOString(),
      });
    }
    return updated;
  }

  async deleteThread(id: string, userId: string): Promise<ChatThread> {
    this.logger.log(`deleteThread: deleting thread ${id} for user ${userId}`);
    const thread = await this.chatThreadsRepository.findById(id);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', id);
    }
    this.validateOwnership(thread, userId);

    await this.chatMessagesRepository.deleteByThreadId(id);
    const deleted = await this.chatThreadsRepository.delete(id);
    this.logger.log(`deleteThread: deleted thread ${id} and its messages`);
    return deleted;
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
