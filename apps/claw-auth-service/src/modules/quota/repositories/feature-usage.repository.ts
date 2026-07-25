import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type FeatureUsageRecord,
  FeatureUsageState,
  type PlanFeatureKey,
  type PlanFeatureWindow,
} from '../../../generated/prisma';

@Injectable()
export class FeatureUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Reservation is keyed by (user, feature, requestId), so a retried request
  // reuses its reservation instead of burning a second lifetime trial.
  async reserve(params: {
    userId: string;
    planId: string | null;
    feature: PlanFeatureKey;
    window: PlanFeatureWindow;
    periodKey: string;
    requestId: string;
  }): Promise<FeatureUsageRecord> {
    return this.prisma.featureUsageRecord.upsert({
      where: {
        userId_feature_requestId: {
          userId: params.userId,
          feature: params.feature,
          requestId: params.requestId,
        },
      },
      update: {},
      create: {
        userId: params.userId,
        planId: params.planId,
        feature: params.feature,
        window: params.window,
        periodKey: params.periodKey,
        requestId: params.requestId,
        state: FeatureUsageState.RESERVED,
      },
    });
  }

  // Counts what the user has actually spent: reservations in flight plus runs
  // already delivered. A RELEASED row is a failed run and must not count.
  async countActive(params: {
    userId: string;
    feature: PlanFeatureKey;
    periodKey: string;
  }): Promise<number> {
    return this.prisma.featureUsageRecord.count({
      where: {
        userId: params.userId,
        feature: params.feature,
        periodKey: params.periodKey,
        state: { in: [FeatureUsageState.RESERVED, FeatureUsageState.CONSUMED] },
      },
    });
  }

  async consume(id: string): Promise<void> {
    await this.prisma.featureUsageRecord.updateMany({
      where: { id, state: FeatureUsageState.RESERVED },
      data: { state: FeatureUsageState.CONSUMED, consumedAt: new Date() },
    });
  }

  async release(id: string): Promise<void> {
    await this.prisma.featureUsageRecord.updateMany({
      where: { id, state: FeatureUsageState.RESERVED },
      data: { state: FeatureUsageState.RELEASED, releasedAt: new Date() },
    });
  }

  async findById(id: string): Promise<FeatureUsageRecord | null> {
    return this.prisma.featureUsageRecord.findUnique({ where: { id } });
  }
}
