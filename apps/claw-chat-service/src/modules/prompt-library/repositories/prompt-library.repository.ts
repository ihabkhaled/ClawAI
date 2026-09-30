import { Injectable } from '@nestjs/common';

import { type Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type CreatePromptTemplateInput,
  type ListPromptTemplatesInput,
  type PromptTemplateRecord,
  type UpdatePromptTemplateInput,
} from '../types/prompt-library.types';

/**
 * Every query is scoped by `userId`, so a template owned by someone else is
 * indistinguishable from a missing one.
 */
@Injectable()
export class PromptLibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countForUser(userId: string): Promise<number> {
    return this.prisma.promptTemplate.count({ where: { userId } });
  }

  async create(input: CreatePromptTemplateInput): Promise<PromptTemplateRecord> {
    return this.prisma.promptTemplate.create({ data: input });
  }

  async findOwned(id: string, userId: string): Promise<PromptTemplateRecord | null> {
    return this.prisma.promptTemplate.findFirst({ where: { id, userId } });
  }

  /** Favourites first, then most recently used (never-used last), then most recently edited. */
  async list(input: ListPromptTemplatesInput): Promise<PromptTemplateRecord[]> {
    const where: Prisma.PromptTemplateWhereInput = { userId: input.userId };
    if (input.favorite !== undefined) {
      where.isFavorite = input.favorite;
    }
    if (input.tag !== undefined) {
      where.tags = { has: input.tag };
    }
    if (input.q !== undefined) {
      where.OR = [
        { title: { contains: input.q, mode: 'insensitive' } },
        { body: { contains: input.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.promptTemplate.findMany({
      where,
      orderBy: [
        { isFavorite: 'desc' },
        { lastUsedAt: { sort: 'desc', nulls: 'last' } },
        { updatedAt: 'desc' },
        { id: 'asc' },
      ],
      skip: input.offset,
      take: input.limit + 1,
    });
  }

  async update(
    id: string,
    userId: string,
    data: UpdatePromptTemplateInput,
  ): Promise<PromptTemplateRecord | null> {
    const result = await this.prisma.promptTemplate.updateMany({ where: { id, userId }, data });
    return result.count === 0 ? null : this.findOwned(id, userId);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.promptTemplate.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }

  async recordUse(id: string, userId: string): Promise<PromptTemplateRecord | null> {
    const result = await this.prisma.promptTemplate.updateMany({
      where: { id, userId },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    });
    return result.count === 0 ? null : this.findOwned(id, userId);
  }
}
