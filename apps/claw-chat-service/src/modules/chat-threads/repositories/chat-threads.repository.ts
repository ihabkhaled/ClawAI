import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type ChatThread, Prisma, ThreadOrigin } from '../../../generated/prisma';
import { type SortOrder } from '../../../common/enums';
import {
  THREAD_LINEAGE_BRANCH_LIMIT,
  THREAD_LINEAGE_SELECT,
} from '../constants/chat-threads.constants';
import {
  type CreateThreadData,
  type ThreadFilters,
  type ThreadLineageEntry,
  type ThreadWithMessageCount,
  type UpdateThreadData,
} from '../types/chat-threads.types';

@Injectable()
export class ChatThreadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateThreadData): Promise<ChatThread> {
    return this.prisma.chatThread.create({ data });
  }

  async createWithinDailyLimit(
    data: CreateThreadData,
    limit: number | null,
  ): Promise<ChatThread | null> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`chat:${data.userId}`}, 0))`;
      if (limit !== null) {
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        const count = await transaction.chatThread.count({
          where: { userId: data.userId, createdAt: { gte: start } },
        });
        if (count >= limit) return null;
      }
      return transaction.chatThread.create({ data });
    });
  }

  /**
   * Creates a thread holding a copy of another thread's opening messages.
   *
   * One transaction, and under the same advisory lock and daily ceiling as an
   * ordinary new thread — otherwise branching would be a way around the chat
   * limit. Returns null when the ceiling is reached, exactly as
   * `createWithinDailyLimit` does, so the caller has one refusal to handle.
   *
   * Each copied message takes a fresh id — two threads claiming one message id
   * would make the receipts hanging off it ambiguous — but keeps everything
   * else that describes it: `metadata` (the attachment `fileIds` a later turn
   * reads back, the reasoning, research and delivery panels), the token, cost
   * and latency figures of the run that produced it, and its original
   * `createdAt`.
   *
   * The timestamp is load-bearing. Messages are ordered by `createdAt` alone,
   * and a bulk insert that let the column default stamps every row with the
   * same transaction time — so a branch used to come back in whatever order
   * Postgres returned it.
   */
  async createBranchWithinDailyLimit(
    data: CreateThreadData,
    limit: number | null,
    sourceThreadId: string,
    upToCreatedAt: Date,
    includePivot = true,
  ): Promise<ChatThread | null> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`chat:${data.userId}`}, 0))`;
      if (limit !== null) {
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        const count = await transaction.chatThread.count({
          where: { userId: data.userId, createdAt: { gte: start } },
        });
        if (count >= limit) return null;
      }

      const branch = await transaction.chatThread.create({ data });
      const source = await transaction.chatMessage.findMany({
        where: {
          threadId: sourceThreadId,
          createdAt: includePivot ? { lte: upToCreatedAt } : { lt: upToCreatedAt },
        },
        orderBy: { createdAt: 'asc' },
      });
      await transaction.chatMessage.createMany({
        data: source.map((message) => ({
          threadId: branch.id,
          role: message.role,
          content: message.content,
          provider: message.provider,
          model: message.model,
          routingMode: message.routingMode,
          routerModel: message.routerModel,
          usedFallback: message.usedFallback,
          inputTokens: message.inputTokens,
          outputTokens: message.outputTokens,
          estimatedCost: message.estimatedCost,
          latencyMs: message.latencyMs,
          metadata: message.metadata ?? Prisma.JsonNull,
          createdAt: message.createdAt,
          originalContent: message.originalContent,
          editedAt: message.editedAt,
        })),
      });
      return branch;
    });
  }

  async findById(id: string): Promise<ChatThread | null> {
    return this.prisma.chatThread.findUnique({ where: { id } });
  }

  /** One lineage entry, owner-scoped. Null when absent or someone else's. */
  async findLineageEntry(userId: string, threadId: string): Promise<ThreadLineageEntry | null> {
    return this.prisma.chatThread.findFirst({
      where: { id: threadId, userId },
      select: THREAD_LINEAGE_SELECT,
    });
  }

  /** Direct branches of one thread, oldest first, owner-scoped. */
  async findDirectBranches(userId: string, threadId: string): Promise<ThreadLineageEntry[]> {
    return this.prisma.chatThread.findMany({
      where: { userId, branchedFromThreadId: threadId },
      orderBy: { createdAt: 'asc' },
      take: THREAD_LINEAGE_BRANCH_LIMIT,
      select: THREAD_LINEAGE_SELECT,
    });
  }

  async findAll(
    filters: ThreadFilters,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: SortOrder,
  ): Promise<ThreadWithMessageCount[]> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    return this.prisma.chatThread.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { _count: { select: { messages: true } } },
    }) as Promise<ThreadWithMessageCount[]>;
  }

  async update(id: string, data: UpdateThreadData): Promise<ChatThread> {
    return this.prisma.chatThread.update({ where: { id }, data });
  }

  async delete(id: string): Promise<ChatThread> {
    return this.prisma.chatThread.delete({ where: { id } });
  }

  async countAll(filters: ThreadFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.chatThread.count({ where });
  }

  private buildWhereClause(filters: ThreadFilters): Prisma.ChatThreadWhereInput {
    const where: Prisma.ChatThreadWhereInput = {
      userId: filters.userId,
      // Always narrowed to one origin. Leaving it off would list every
      // conversation the user has, which is how the coding agent's runs ended
      // up in the web chat list in the first place.
      origin: filters.origin ?? ThreadOrigin.WEB,
    };

    if (filters.isPinned !== undefined) {
      where.isPinned = filters.isPinned;
    }

    if (filters.isArchived !== undefined) {
      where.isArchived = filters.isArchived;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { messages: { some: { content: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    return where;
  }
}
