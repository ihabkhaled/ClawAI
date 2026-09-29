import { Injectable } from '@nestjs/common';
import {
  type ContextPack,
  type ContextPackItem,
  ContextPackScope,
  Prisma,
} from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type AddContextPackItemData,
  type ContextPackFilters,
  type ContextPackWithItems,
  type CreateContextPackData,
  type UpdateContextPackData,
  type UpdateContextPackItemData,
} from '../types/context-packs.types';
import type { ContextPackItemEmbeddingHit } from '../types/context-pack-embedding.types';

@Injectable()
export class ContextPacksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateContextPackData): Promise<ContextPack> {
    return this.prisma.contextPack.create({
      data: {
        userId: data.userId,
        ownerUserId: data.ownerUserId ?? data.userId,
        name: data.name,
        description: data.description,
        scope: data.scope,
        scopeRef: data.scopeRef,
        legacyScope: data.legacyScope,
        tags: data.tags ?? undefined,
        visibility: data.visibility,
        color: data.color,
        icon: data.icon,
        templateId: data.templateId,
        pinned: data.pinned,
      },
    });
  }

  async createWithinLimit(
    data: CreateContextPackData,
    limit: number | null,
  ): Promise<ContextPack | null> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`context-pack:${data.userId}`}, 0))`;
      return limit !== null &&
        (await transaction.contextPack.count({ where: { userId: data.userId } })) >= limit
        ? null
        : transaction.contextPack.create({
            data: {
              userId: data.userId,
              ownerUserId: data.ownerUserId ?? data.userId,
              name: data.name,
              description: data.description,
              scope: data.scope,
              scopeRef: data.scopeRef,
              legacyScope: data.legacyScope,
              tags: data.tags ?? undefined,
              visibility: data.visibility,
              color: data.color,
              icon: data.icon,
              templateId: data.templateId,
              pinned: data.pinned,
            },
          });
    });
  }

  async findByUserAndTag(userId: string, tag: string): Promise<ContextPack | null> {
    return this.prisma.contextPack.findFirst({ where: { userId, tags: { has: tag } } });
  }

  async findById(id: string): Promise<ContextPackWithItems | null> {
    return this.prisma.contextPack.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  /**
   * Packs one user's chat turn may use: the thread's explicit ids plus every
   * pack whose scope applies everywhere (USER) or to this thread (THREAD).
   * `userId` is in the WHERE clause of every branch — an id belonging to
   * another user never matches, whatever the caller sends.
   */
  async findForChat(
    userId: string,
    packIds: readonly string[],
    threadId: string | undefined,
    now: Date,
    limit: number,
  ): Promise<ContextPackWithItems[]> {
    const applies: Prisma.ContextPackWhereInput[] = [{ scope: ContextPackScope.USER }];
    if (packIds.length > 0) applies.push({ id: { in: [...packIds] } });
    if (threadId !== undefined) {
      applies.push({ scope: ContextPackScope.THREAD, scopeRef: threadId });
    }
    return this.prisma.contextPack.findMany({
      where: {
        userId,
        isEnabled: true,
        OR: [{ pausedUntil: null }, { pausedUntil: { lt: now } }],
        AND: [{ OR: applies }],
      },
      include: {
        items: { where: { isEnabled: true }, orderBy: [{ pinned: 'desc' }, { sortOrder: 'asc' }] },
      },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });
  }

  async findAll(filters: ContextPackFilters, page: number, limit: number): Promise<ContextPack[]> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;
    return this.prisma.contextPack.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: UpdateContextPackData): Promise<ContextPack> {
    return this.prisma.contextPack.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.scope !== undefined ? { scope: data.scope } : {}),
        ...(data.scopeRef !== undefined ? { scopeRef: data.scopeRef } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
        ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
        ...(data.pausedUntil !== undefined ? { pausedUntil: data.pausedUntil } : {}),
        ...(data.pinned !== undefined ? { pinned: data.pinned } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        version: { increment: 1 },
      },
    });
  }

  async delete(id: string): Promise<ContextPack> {
    return this.prisma.contextPack.delete({ where: { id } });
  }

  async countAll(filters: ContextPackFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.contextPack.count({ where });
  }

  async findAttachmentsForScope(
    scope: ContextPackFilters['scope'],
    scopeRef: string,
    limit = 50,
  ): Promise<ContextPack[]> {
    return scope === undefined
      ? []
      : this.prisma.contextPack.findMany({
          where: {
            attachments: { some: { scope, scopeRef, isActive: true } },
          },
          take: limit,
        });
  }

  async addItem(data: AddContextPackItemData): Promise<ContextPackItem> {
    return this.prisma.contextPackItem.create({
      data: {
        contextPackId: data.contextPackId,
        itemType: data.itemType,
        legacyType: data.legacyType,
        content: data.content,
        fileId: data.fileId,
        url: data.url,
        memoryRefId: data.memoryRefId,
        sortOrder: data.sortOrder ?? 0,
        isEnabled: data.isEnabled,
        pinned: data.pinned,
        tokenCountEstimate: data.tokenCountEstimate,
      },
    });
  }

  async updateItem(id: string, data: UpdateContextPackItemData): Promise<ContextPackItem> {
    return this.prisma.contextPackItem.update({
      where: { id },
      data: {
        ...(data.itemType !== undefined ? { itemType: data.itemType } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.fileId !== undefined ? { fileId: data.fileId } : {}),
        ...(data.url !== undefined ? { url: data.url } : {}),
        ...(data.memoryRefId !== undefined ? { memoryRefId: data.memoryRefId } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
        ...(data.pinned !== undefined ? { pinned: data.pinned } : {}),
        ...(data.tokenCountEstimate !== undefined
          ? { tokenCountEstimate: data.tokenCountEstimate }
          : {}),
      },
    });
  }

  async removeItem(id: string): Promise<ContextPackItem> {
    return this.prisma.contextPackItem.delete({ where: { id } });
  }

  async reorderItems(_contextPackId: string, itemIds: string[]): Promise<void> {
    const updates = itemIds.map((id, index) =>
      this.prisma.contextPackItem.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);
  }

  async upsertItemEmbedding(itemId: string, vector: number[]): Promise<void> {
    const literal = this.toVectorLiteral(vector);
    await this.prisma.$executeRawUnsafe(
      `UPDATE "context_pack_items"
         SET "embedding" = $1::vector, "embedded_at" = NOW()
       WHERE "id" = $2`,
      literal,
      itemId,
    );
  }

  async cosineSearchItems(
    packIds: string[],
    vector: number[],
    topK: number,
  ): Promise<ContextPackItemEmbeddingHit[]> {
    if (packIds.length === 0) {
      return [];
    }
    const literal = this.toVectorLiteral(vector);
    const placeholders = packIds.map((_, i) => `$${String(i + 3)}`).join(',');
    return this.prisma.$queryRawUnsafe<ContextPackItemEmbeddingHit[]>(
      `SELECT "id" as "itemId",
              "context_pack_id" as "contextPackId",
              1 - ("embedding" <=> $1::vector) as "score"
       FROM "context_pack_items"
       WHERE "is_enabled" = true
         AND "embedding" IS NOT NULL
         AND "context_pack_id" IN (${placeholders})
       ORDER BY "embedding" <=> $1::vector
       LIMIT $2`,
      literal,
      topK,
      ...packIds,
    );
  }

  private toVectorLiteral(vector: number[]): string {
    return `[${vector.map((n) => n.toString()).join(',')}]`;
  }

  private buildWhereClause(filters: ContextPackFilters): Prisma.ContextPackWhereInput {
    const where: Prisma.ContextPackWhereInput = { userId: filters.userId };
    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.scope !== undefined) where.scope = filters.scope;
    if (filters.scopeRef !== undefined) where.scopeRef = filters.scopeRef;
    if (filters.visibility !== undefined) where.visibility = filters.visibility;
    if (filters.enabledOnly) where.isEnabled = true;
    return where;
  }
}
