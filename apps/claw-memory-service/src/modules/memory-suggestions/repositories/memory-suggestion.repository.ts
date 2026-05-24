import { Injectable } from '@nestjs/common';
import {
  type MemorySuggestion,
  MemorySuggestionStatus,
  type Prisma,
} from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  CreateSuggestionData,
  DecideSuggestionData,
  SuggestionFilters,
} from '../types/memory-suggestion.types';

@Injectable()
export class MemorySuggestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSuggestionData): Promise<MemorySuggestion> {
    return this.prisma.memorySuggestion.create({
      data: {
        userId: data.userId,
        type: data.type,
        content: data.content,
        confidence: data.confidence,
        sensitivity: data.sensitivity,
        reason: data.reason ?? null,
        sourceThreadId: data.sourceThreadId ?? null,
        sourceMessageId: data.sourceMessageId ?? null,
      },
    });
  }

  async findById(id: string): Promise<MemorySuggestion | null> {
    return this.prisma.memorySuggestion.findUnique({ where: { id } });
  }

  async findAll(
    filters: SuggestionFilters,
    page: number,
    limit: number,
  ): Promise<MemorySuggestion[]> {
    const where = this.buildWhere(filters);
    return this.prisma.memorySuggestion.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countAll(filters: SuggestionFilters): Promise<number> {
    return this.prisma.memorySuggestion.count({ where: this.buildWhere(filters) });
  }

  async findByIds(ids: string[]): Promise<MemorySuggestion[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.prisma.memorySuggestion.findMany({ where: { id: { in: ids } } });
  }

  async decide(id: string, data: DecideSuggestionData): Promise<MemorySuggestion> {
    return this.prisma.memorySuggestion.update({
      where: { id },
      data: {
        status: data.status,
        decidedAt: new Date(),
        decidedBy: data.decidedBy,
        resultingMemoryId: data.resultingMemoryId ?? null,
      },
    });
  }

  async expireOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.memorySuggestion.updateMany({
      where: { status: MemorySuggestionStatus.PENDING, createdAt: { lt: date } },
      data: { status: MemorySuggestionStatus.EXPIRED, decidedAt: new Date(), decidedBy: 'system' },
    });
    return result.count;
  }

  private buildWhere(filters: SuggestionFilters): Prisma.MemorySuggestionWhereInput {
    const where: Prisma.MemorySuggestionWhereInput = { userId: filters.userId };
    if (filters.status !== undefined) {
      where.status = filters.status;
    }
    return where;
  }
}
