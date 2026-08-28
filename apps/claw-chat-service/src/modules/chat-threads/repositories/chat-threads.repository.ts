import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type ChatThread, Prisma } from '../../../generated/prisma';
import { type SortOrder } from '../../../common/enums';
import {
  type CreateThreadData,
  type ThreadFilters,
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
   * The copy is deliberately shallow on provenance: the branch keeps each
   * message's text, role and model, and takes fresh identifiers and timestamps.
   * Carrying the original ids across would make two threads claim the same
   * message, and the receipts hanging off those ids belong to the original run.
   */
  async createBranchWithinDailyLimit(
    data: CreateThreadData,
    limit: number | null,
    sourceThreadId: string,
    upToCreatedAt: Date,
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
        where: { threadId: sourceThreadId, createdAt: { lte: upToCreatedAt } },
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
        })),
      });
      return branch;
    });
  }

  async findById(id: string): Promise<ChatThread | null> {
    return this.prisma.chatThread.findUnique({ where: { id } });
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
