import { ForbiddenException, Injectable } from '@nestjs/common';
import { Permission } from '@claw/shared-types';
import { EntitlementsService } from '../../entitlements/services/entitlements.service';
import { ThreadJobBudgetRepository } from '../../entitlements/repositories/thread-job-budget.repository';
import { FeatureUsageConsumptionService } from '../../quota/services/feature-usage-consumption.service';
import { FeatureSettlement } from '../../quota/enums/feature-settlement.enum';
import { THREAD_JOB_REQUIRED_FEATURES } from '../constants/thread-job-budget.constants';
import { ThreadJobBudgetCloseStatus } from '../enums/thread-job-budget-close-status.enum';

@Injectable()
export class ThreadJobBudgetService {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly featureUsage: FeatureUsageConsumptionService,
    private readonly repository: ThreadJobBudgetRepository,
  ) {}

  async reserve(input: { userId: string; requestId: string; capMicroUsd: bigint }) {
    if (input.capMicroUsd < 0n) throw new ForbiddenException('spend cap must be non-negative');
    const existing = await this.repository.findByRequest(input.userId, input.requestId);
    if (existing) {
      if (existing.capMicroUsd !== input.capMicroUsd)
        throw new Error('idempotency key already has a different spend cap');
      if (existing.status !== 'ACTIVE')
        throw new ForbiddenException('Threads budget is already closed');
      return existing;
    }
    const user = await this.entitlements.getEnforcedForUser(input.userId);
    if (!user.permissions.includes(Permission.THREAD_GENERATION_USE))
      throw new ForbiddenException('Threads generation is not permitted');
    const reservations: string[] = [];
    try {
      for (const feature of THREAD_JOB_REQUIRED_FEATURES) {
        const result = await this.featureUsage.reserve({
          userId: input.userId,
          feature,
          requestId: `${input.requestId}:${feature}`,
        });
        if (!result.allowed)
          throw new ForbiddenException(
            `Threads generation requires available ${feature} entitlement`,
          );
        if (result.reservationId) reservations.push(result.reservationId);
      }
      return await this.repository.create({ ...input, featureReservationIds: reservations });
    } catch (error) {
      await Promise.all(
        reservations.map((id) => this.featureUsage.settle(id, FeatureSettlement.RELEASE)),
      );
      throw error;
    }
  }

  reserveCall(input: {
    budgetId: string;
    requestId: string;
    creditReservationId: string | null;
    amountMicroUsd: bigint;
  }) {
    return this.repository.reserveCall(input);
  }

  settleCall(budgetId: string, requestId: string, settledMicroUsd: bigint) {
    return this.repository.settleCall(budgetId, requestId, settledMicroUsd);
  }

  releaseCall(budgetId: string, requestId: string) {
    return this.repository.releaseCall(budgetId, requestId);
  }

  async close(budgetId: string, status: ThreadJobBudgetCloseStatus) {
    const budget = await this.repository.get(budgetId);
    if (!budget) return false;
    if (budget.status !== 'ACTIVE') return budget.status === status;
    const result = await this.repository.close(budgetId, status);
    if (!result || result.count === 0) return false;
    const outcome =
      status === ThreadJobBudgetCloseStatus.FINALIZED
        ? FeatureSettlement.CONSUME
        : FeatureSettlement.RELEASE;
    await Promise.all(
      budget.featureReservationIds.map((id) => this.featureUsage.settle(id, outcome)),
    );
    return true;
  }
}
