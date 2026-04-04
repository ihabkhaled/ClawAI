import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { type ChatThread, Prisma } from "../../../generated/prisma";
import {
  type CreateThreadData,
  type UpdateThreadData,
  type ThreadFilters,
  type ThreadWithMessageCount,
} from "../types/chat-threads.types";

@Injectable()
export class ChatThreadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateThreadData): Promise<ChatThread> {
    return this.prisma.chatThread.create({ data });
  }

  async findById(id: string): Promise<ChatThread | null> {
    return this.prisma.chatThread.findUnique({ where: { id } });
  }

  async findAll(
    filters: ThreadFilters,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: "asc" | "desc",
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
      where.title = { contains: filters.search, mode: "insensitive" };
    }

    return where;
  }
}
