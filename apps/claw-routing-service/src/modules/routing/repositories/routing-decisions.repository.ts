import { Injectable } from '@nestjs/common';
import { type Prisma, type RoutingDecision, RoutingMode } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type CreateDecisionData } from '../types/routing.types';
import { type ReplayFilters } from '../types/replay.types';
import { type RawRecoveryData } from '../types/recovery.types';

@Injectable()
export class RoutingDecisionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDecisionData): Promise<RoutingDecision> {
    return this.prisma.routingDecision.create({
      data: {
        ...data,
        confidence: data.confidence !== undefined ? data.confidence : null,
      },
    });
  }

  async findById(id: string): Promise<RoutingDecision | null> {
    return this.prisma.routingDecision.findUnique({ where: { id } });
  }

  async findByThreadId(threadId: string, page: number, limit: number): Promise<RoutingDecision[]> {
    const skip = (page - 1) * limit;
    return this.prisma.routingDecision.findMany({
      where: { threadId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByThreadId(threadId: string): Promise<number> {
    return this.prisma.routingDecision.count({ where: { threadId } });
  }

  async findRecent(filters: ReplayFilters): Promise<RoutingDecision[]> {
    const where: Prisma.RoutingDecisionWhereInput = {};

    if (filters.threadId) {
      where.threadId = filters.threadId;
    }

    if (
      filters.routingMode &&
      Object.values(RoutingMode).includes(filters.routingMode as RoutingMode)
    ) {
      where.routingMode = filters.routingMode as RoutingMode;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.routingDecision.findMany({
      where,
      take: filters.limit ?? 50,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRecoveryStats(limit: number): Promise<RawRecoveryData> {
    const fallbackWhere = { fallbackProvider: { not: null } };

    const [total, withFallback, providerCounts, recent] = await Promise.all([
      this.prisma.routingDecision.count(),
      this.prisma.routingDecision.count({ where: fallbackWhere }),
      this.prisma.routingDecision.groupBy({
        by: ['selectedProvider'],
        _count: { selectedProvider: true },
        where: fallbackWhere,
      }),
      this.prisma.routingDecision.findMany({
        where: fallbackWhere,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          selectedProvider: true,
          selectedModel: true,
          fallbackProvider: true,
          fallbackModel: true,
          routingMode: true,
        },
      }),
    ]);

    return { total, withFallback, providerCounts, recent };
  }
}
