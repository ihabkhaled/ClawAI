import { Injectable } from '@nestjs/common';
import { type MemoryRecord, MemoryType, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type CreateMemoryData,
  type MemoryFilters,
  type UpdateMemoryData,
} from '../types/memory.types';
import type {
  MemoryEmbeddingSearchResult,
  ScopedRetrievalFilter,
} from '../types/memory-embedding.types';

@Injectable()
export class MemoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMemoryData): Promise<MemoryRecord> {
    return this.prisma.memoryRecord.create({
      data: {
        userId: data.userId,
        type: data.type,
        content: data.content,
        sourceThreadId: data.sourceThreadId,
        sourceMessageId: data.sourceMessageId,
        scope: data.scope,
        scopeRef: data.scopeRef,
        tags: data.tags ?? undefined,
        category: data.category,
        priority: data.priority,
        confidence: data.confidence,
        source: data.source,
        sensitivity: data.sensitivity,
        retentionPolicy: data.retentionPolicy,
        expiresAt: data.expiresAt,
        pinned: data.pinned,
        provenanceJson:
          data.provenanceJson === undefined
            ? undefined
            : (data.provenanceJson as Prisma.InputJsonValue),
      },
    });
  }

  async findById(id: string): Promise<MemoryRecord | null> {
    return this.prisma.memoryRecord.findUnique({ where: { id } });
  }

  async findAll(filters: MemoryFilters, page: number, limit: number): Promise<MemoryRecord[]> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;
    const orderBy = this.buildOrderBy(filters.sort);
    return this.prisma.memoryRecord.findMany({ where, skip, take: limit, orderBy });
  }

  async update(id: string, data: UpdateMemoryData): Promise<MemoryRecord> {
    return this.prisma.memoryRecord.update({
      where: { id },
      data: {
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
        ...(data.scope !== undefined ? { scope: data.scope } : {}),
        ...(data.scopeRef !== undefined ? { scopeRef: data.scopeRef } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.retentionPolicy !== undefined ? { retentionPolicy: data.retentionPolicy } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
        ...(data.sensitivity !== undefined ? { sensitivity: data.sensitivity } : {}),
        ...(data.pinned !== undefined ? { pinned: data.pinned } : {}),
        ...(data.pausedUntil !== undefined ? { pausedUntil: data.pausedUntil } : {}),
      },
    });
  }

  async delete(id: string): Promise<MemoryRecord> {
    return this.prisma.memoryRecord.delete({ where: { id } });
  }

  async findEnabledByUserId(userId: string, limit: number): Promise<MemoryRecord[]> {
    return this.prisma.memoryRecord.findMany({
      where: {
        userId,
        isEnabled: true,
        OR: [{ pausedUntil: null }, { pausedUntil: { lt: new Date() } }],
      },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });
  }

  async findLearnedPreferences(
    userId: string,
    actionKindFilter: string | undefined,
    limit: number,
  ): Promise<MemoryRecord[]> {
    const baseFilter = {
      userId,
      isEnabled: true,
      type: MemoryType.PREFERENCE,
    };
    if (actionKindFilter !== undefined && actionKindFilter.length > 0) {
      return this.prisma.memoryRecord.findMany({
        where: { ...baseFilter, content: { contains: actionKindFilter, mode: 'insensitive' } },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });
    }
    return this.prisma.memoryRecord.findMany({
      where: baseFilter,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async existsSimilar(userId: string, type: MemoryType, content: string): Promise<boolean> {
    const existing = await this.prisma.memoryRecord.findFirst({
      where: {
        userId,
        type,
        content: { contains: content.slice(0, 100), mode: 'insensitive' },
      },
    });
    return existing !== null;
  }

  async findExpired(now: Date, limit: number): Promise<MemoryRecord[]> {
    return this.prisma.memoryRecord.findMany({
      where: { expiresAt: { lt: now }, isEnabled: true },
      take: limit,
    });
  }

  async incrementUseCount(id: string): Promise<void> {
    await this.prisma.memoryRecord.update({
      where: { id },
      data: {
        useCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  async countAll(filters: MemoryFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.memoryRecord.count({ where });
  }

  async findByUserScopeForRetrieval(
    userId: string,
    threadId: string | undefined,
    workspaceId: string | undefined,
    projectId: string | undefined,
    limit: number,
  ): Promise<MemoryRecord[]> {
    const scopeOr: Prisma.MemoryRecordWhereInput[] = [{ scope: 'USER' }];
    if (threadId !== undefined) {
      scopeOr.push({ scope: 'THREAD', scopeRef: threadId });
    }
    if (workspaceId !== undefined) {
      scopeOr.push({ scope: 'WORKSPACE', scopeRef: workspaceId });
    }
    if (projectId !== undefined) {
      scopeOr.push({ scope: 'PROJECT', scopeRef: projectId });
    }
    return this.prisma.memoryRecord.findMany({
      where: {
        userId,
        isEnabled: true,
        OR: scopeOr,
        AND: [
          {
            OR: [{ pausedUntil: null }, { pausedUntil: { lt: new Date() } }],
          },
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        ],
      },
      orderBy: [{ pinned: 'desc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });
  }

  async upsertEmbedding(memoryId: string, vector: number[]): Promise<void> {
    const literal = this.toVectorLiteral(vector);
    await this.prisma.$executeRawUnsafe(
      `UPDATE "memory_records"
         SET "embedding" = $1::vector, "embedded_at" = NOW()
       WHERE "id" = $2`,
      literal,
      memoryId,
    );
  }

  async cosineSearch(
    filter: ScopedRetrievalFilter,
    vector: number[],
    topK: number,
  ): Promise<MemoryEmbeddingSearchResult[]> {
    const literal = this.toVectorLiteral(vector);
    const conditions = [
      '"user_id" = $2',
      '"is_enabled" = true',
      '"embedding" IS NOT NULL',
      '("paused_until" IS NULL OR "paused_until" < NOW())',
      '("expires_at" IS NULL OR "expires_at" > NOW())',
    ];
    const scopeClauses: string[] = [`"scope" = 'USER'`];
    const params: unknown[] = [literal, filter.userId, topK];
    let paramIndex = 4;
    const addScope = (scopeKey: string, ref: string | undefined): void => {
      if (ref === undefined) return;
      scopeClauses.push(`("scope" = '${scopeKey}' AND "scope_ref" = $${String(paramIndex)})`);
      params.push(ref);
      paramIndex += 1;
    };
    addScope('THREAD', filter.threadId);
    addScope('WORKSPACE', filter.workspaceId);
    addScope('PROJECT', filter.projectId);
    conditions.push(`(${scopeClauses.join(' OR ')})`);
    const sql = `
      SELECT "id" as "memoryId",
             1 - ("embedding" <=> $1::vector) as "score"
      FROM "memory_records"
      WHERE ${conditions.join(' AND ')}
      ORDER BY "embedding" <=> $1::vector
      LIMIT $3`;
    return this.prisma.$queryRawUnsafe<MemoryEmbeddingSearchResult[]>(sql, ...params);
  }

  private toVectorLiteral(vector: number[]): string {
    return `[${vector.map((n) => n.toString()).join(',')}]`;
  }

  private buildWhereClause(filters: MemoryFilters): Prisma.MemoryRecordWhereInput {
    const where: Prisma.MemoryRecordWhereInput = { userId: filters.userId };
    if (filters.type !== undefined) where.type = filters.type;
    if (filters.isEnabled !== undefined) where.isEnabled = filters.isEnabled;
    if (filters.scope !== undefined) where.scope = filters.scope;
    if (filters.scopeRef !== undefined) where.scopeRef = filters.scopeRef;
    if (filters.source !== undefined) where.source = filters.source;
    if (filters.sensitivity !== undefined) where.sensitivity = filters.sensitivity;
    if (filters.category !== undefined) where.category = filters.category;
    if (filters.pinnedOnly) where.pinned = true;
    if (filters.tag !== undefined) where.tags = { has: filters.tag };
    if (filters.search) {
      where.content = { contains: filters.search, mode: 'insensitive' };
    }
    return where;
  }

  private buildOrderBy(
    sort: MemoryFilters['sort'],
  ): Prisma.MemoryRecordOrderByWithRelationInput | Prisma.MemoryRecordOrderByWithRelationInput[] {
    switch (sort) {
      case 'oldest':
        return { createdAt: 'asc' };
      case 'most_used':
        return [{ useCount: 'desc' }, { lastUsedAt: 'desc' }];
      case 'lowest_confidence':
        return [{ confidence: 'asc' }, { createdAt: 'desc' }];
      case 'expiring_soon':
        return [{ expiresAt: 'asc' }, { createdAt: 'desc' }];
      case 'newest':
      default:
        return { createdAt: 'desc' };
    }
  }
}
