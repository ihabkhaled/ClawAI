import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type FeatureCapReservation } from '../types/quota.types';
import {
  type FeatureUsageRecord,
  FeatureUsageState,
  type PlanFeatureKey,
  type PlanFeatureWindow,
  Prisma,
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

  // Count and write happen in one transaction under a per-(user, feature) advisory
  // lock, so two concurrent reservations cannot both read "under the cap" and both
  // insert. The lock is released at commit. `limit: null` means uncapped.
  //
  // Retry semantics, keyed by requestId:
  //  - RESERVED or CONSUMED row: returned as is, with no cap check. The retry is the
  //    same run, and it already counts.
  //  - RELEASED row: revived to RESERVED, but only after the cap check, since the
  //    freed slot may have been taken meanwhile.
  //  - no row: cap check, then insert.
  async reserveWithinLimit(params: {
    userId: string;
    planId: string | null;
    feature: PlanFeatureKey;
    window: PlanFeatureWindow;
    periodKey: string;
    requestId: string;
    limit: number | null;
  }): Promise<FeatureCapReservation> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${params.userId}::text || ${params.feature}::text))`,
      );
      const existing = await tx.featureUsageRecord.findUnique({
        where: {
          userId_feature_requestId: {
            userId: params.userId,
            feature: params.feature,
            requestId: params.requestId,
          },
        },
      });
      if (existing && existing.state !== FeatureUsageState.RELEASED) {
        return { held: true, record: existing };
      }
      if (params.limit !== null) {
        const used = await tx.featureUsageRecord.count({
          where: {
            userId: params.userId,
            feature: params.feature,
            periodKey: params.periodKey,
            state: { in: [FeatureUsageState.RESERVED, FeatureUsageState.CONSUMED] },
          },
        });
        if (used >= params.limit) {
          return { held: false, used };
        }
      }
      if (existing) {
        const revived = await tx.featureUsageRecord.update({
          where: { id: existing.id },
          data: {
            state: FeatureUsageState.RESERVED,
            planId: params.planId,
            window: params.window,
            periodKey: params.periodKey,
            reservedAt: new Date(),
            releasedAt: null,
          },
        });
        return { held: true, record: revived };
      }
      const created = await tx.featureUsageRecord.create({
        data: {
          userId: params.userId,
          planId: params.planId,
          feature: params.feature,
          window: params.window,
          periodKey: params.periodKey,
          requestId: params.requestId,
          state: FeatureUsageState.RESERVED,
        },
      });
      return { held: true, record: created };
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
