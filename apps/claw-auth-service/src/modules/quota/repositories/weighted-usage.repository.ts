import { Injectable } from '@nestjs/common';
import { type WeightedUsagePeriodField } from '../../../common/enums/weighted-usage-period-field.enum';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type WeightedUsageRecord, WeightedUsageState } from '../../../generated/prisma';
import { type WeightedFinalizeInput, type WeightedReservationInput } from '../types/quota.types';

@Injectable()
export class WeightedUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createReservation(params: {
    reservationId: string;
    input: WeightedReservationInput;
    dayKey: string;
    weekKey: string;
    monthKey: string;
  }): Promise<WeightedUsageRecord> {
    return this.prisma.weightedUsageRecord.create({
      data: {
        reservationId: params.reservationId,
        userId: params.input.userId,
        planId: params.input.planId,
        requestId: params.input.requestId,
        provider: params.input.provider,
        model: params.input.model,
        workflow: params.input.workflow,
        weightedTokens: params.input.estimatedWeightedTokens,
        estimatedCostMicroUsd: params.input.estimatedCostMicroUsd,
        state: WeightedUsageState.RESERVED,
        dayKey: params.dayKey,
        weekKey: params.weekKey,
        monthKey: params.monthKey,
        billingPeriodKey: params.input.billingPeriodKey,
      },
    });
  }

  async findByReservationId(reservationId: string): Promise<WeightedUsageRecord | null> {
    return this.prisma.weightedUsageRecord.findUnique({ where: { reservationId } });
  }

  async finalize(input: WeightedFinalizeInput): Promise<WeightedUsageRecord | null> {
    return this.prisma.weightedUsageRecord.update({
      where: { reservationId: input.reservationId },
      data: {
        rawInputTokens: input.rawInputTokens,
        rawCachedTokens: input.rawCachedTokens,
        rawReasoningTokens: input.rawReasoningTokens,
        rawOutputTokens: input.rawOutputTokens,
        toolCallCount: input.toolCallCount,
        weightedTokens: input.actualWeightedTokens,
        actualCostMicroUsd: input.actualCostMicroUsd,
        state: WeightedUsageState.FINALIZED,
        finalizedAt: new Date(),
      },
    });
  }

  async markReleased(reservationId: string): Promise<void> {
    await this.prisma.weightedUsageRecord.updateMany({
      where: { reservationId, state: WeightedUsageState.RESERVED },
      data: { state: WeightedUsageState.RELEASED, finalizedAt: new Date() },
    });
  }

  async deleteByReservationId(reservationId: string): Promise<void> {
    await this.prisma.weightedUsageRecord.deleteMany({ where: { reservationId } });
  }

  // Durable truth for a window, used by the reconciliation job to rebuild or
  // verify the Redis counters rather than trusting them indefinitely.
  async sumWeightedTokens(params: {
    userId: string;
    field: WeightedUsagePeriodField;
    periodKey: string;
  }): Promise<number> {
    const result = await this.prisma.weightedUsageRecord.aggregate({
      _sum: { weightedTokens: true },
      where: {
        userId: params.userId,
        [params.field]: params.periodKey,
        state: { in: [WeightedUsageState.RESERVED, WeightedUsageState.FINALIZED] },
      },
    });
    return result._sum.weightedTokens ?? 0;
  }
}
