import { Injectable } from '@nestjs/common';

import { type Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type CreatePromptTemplateInput,
  type ListPromptTemplatesInput,
  type PromptTagCount,
  type PromptTemplateRecord,
  type UpdatePromptTemplateInput,
} from '../types/prompt-library.types';
import { escapeLikePattern } from '../utilities/prompt-template-view.utility';

/**
 * Every query is scoped by `userId`, so a template owned by someone else is
 * indistinguishable from a missing one.
 */
@Injectable()
export class PromptLibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Count-then-create under a per-user transaction advisory lock, so parallel
   * creates cannot all read the same count and overshoot `max`. Returns null at the cap.
   */
  async createWithinLimit(
    input: CreatePromptTemplateInput,
    max: number,
  ): Promise<PromptTemplateRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.userId}))`;
      const count = await tx.promptTemplate.count({ where: { userId: input.userId } });
      return count >= max ? null : tx.promptTemplate.create({ data: input });
    });
  }

  /** Distinct tags with how many of the caller's templates carry each, most used first. */
  async listTags(userId: string, cap: number): Promise<PromptTagCount[]> {
    return this.prisma.$queryRaw<PromptTagCount[]>`
      SELECT tag, COUNT(*)::int AS count
      FROM prompt_templates, unnest(tags) AS tag
      WHERE user_id = ${userId}
      GROUP BY tag
      ORDER BY count DESC, tag ASC
      LIMIT ${cap}`;
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
      const q = escapeLikePattern(input.q);
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
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
