import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type Prisma } from '../../../generated/prisma';
import { USAGE_COUNTED_STATES } from '../constants/usage-ledger-states.constants';
import { type UsageAggregateRow, type UsageWindow } from '../types/usage-attribution.types';
import { toUsageAggregateRow } from '../utilities/usage-aggregate-row.utility';

/**
 * Read-only grouped sums over the weighted-usage ledger for attribution.
 *
 * Every query is scoped by an explicit user id list the service resolved from
 * the caller's own identity or from an organization the caller administers —
 * this repository never widens that scope.
 */
@Injectable()
export class UsageAttributionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async sumByWorkflow(userIds: string[], window: UsageWindow): Promise<UsageAggregateRow[]> {
    const rows = await this.prisma.weightedUsageRecord.groupBy({
      by: ['workflow'],
      where: this.where(userIds, window),
      _count: { _all: true },
      _sum: { weightedTokens: true, rawInputTokens: true, rawOutputTokens: true },
    });
    return rows.map((row) => toUsageAggregateRow({ workflow: row.workflow }, row));
  }

  async sumByModel(userIds: string[], window: UsageWindow): Promise<UsageAggregateRow[]> {
    const rows = await this.prisma.weightedUsageRecord.groupBy({
      by: ['provider', 'model'],
      where: this.where(userIds, window),
      _count: { _all: true },
      _sum: { weightedTokens: true, rawInputTokens: true, rawOutputTokens: true },
    });
    return rows.map((row) =>
      toUsageAggregateRow({ provider: row.provider, model: row.model }, row),
    );
  }

  async sumByUser(userIds: string[], window: UsageWindow): Promise<UsageAggregateRow[]> {
    const rows = await this.prisma.weightedUsageRecord.groupBy({
      by: ['userId'],
      where: this.where(userIds, window),
      _count: { _all: true },
      _sum: { weightedTokens: true, rawInputTokens: true, rawOutputTokens: true },
    });
    return rows.map((row) => toUsageAggregateRow({ userId: row.userId }, row));
  }

  private where(userIds: string[], window: UsageWindow): Prisma.WeightedUsageRecordWhereInput {
    return {
      userId: { in: userIds },
      state: { in: USAGE_COUNTED_STATES },
      createdAt: { gte: window.from, lt: window.to },
    };
  }
}
