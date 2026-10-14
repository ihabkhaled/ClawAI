import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Permission } from '@claw/shared-types';
import { type ThreadJobBudget } from '../../../generated/prisma';
import { EntitlementsService } from '../../entitlements/services/entitlements.service';
import { ThreadJobBudgetRepository } from '../../entitlements/repositories/thread-job-budget.repository';
import {
  PRISMA_UNIQUE_VIOLATION_CODE,
  THREAD_BUDGET_CALL_RELEASE_REASON,
} from '../../entitlements/constants/thread-job-budget-retry.constants';
import {
  type ThreadCallReserveResult,
  type ThreadJobBudgetSummary,
} from '../../entitlements/types/thread-job-budget.types';
import { toThreadJobBudgetSummary } from '../../entitlements/utilities/thread-call-reserve-reply.utility';
import {
  isRetryableTransactionError,
  SerializationRetryExhaustedError,
} from '../../entitlements/utilities/serializable-retry.utility';
import { FeatureUsageConsumptionService } from '../../quota/services/feature-usage-consumption.service';
import { FeatureSettlement } from '../../quota/enums/feature-settlement.enum';
import {
  THREAD_BUDGET_BUSY_CODE,
  THREAD_JOB_REQUIRED_FEATURES,
} from '../constants/thread-job-budget.constants';
import { ThreadJobBudgetCloseStatus } from '../enums/thread-job-budget-close-status.enum';
import { CreditReservationManager } from '../managers/credit-reservation.manager';
import { ThreadJobBudgetFreeMeterRepository } from '../repositories/thread-job-budget-free-meter.repository';
import { threadAllowanceRefusal } from '../utilities/thread-job-budget-refusal.utility';

@Injectable()
export class ThreadJobBudgetService {
  private readonly logger = new Logger(ThreadJobBudgetService.name);

  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly featureUsage: FeatureUsageConsumptionService,
    private readonly repository: ThreadJobBudgetRepository,
    private readonly credit: CreditReservationManager,
    private readonly freeMeter: ThreadJobBudgetFreeMeterRepository,
  ) {}

  async reserve(input: {
    userId: string;
    requestId: string;
    capMicroUsd: bigint;
  }): Promise<ThreadJobBudget> {
    if (input.capMicroUsd < 0n) throw new ForbiddenException('spend cap must be non-negative');
    const existing = await this.repository.findByRequest(input.userId, input.requestId);
    if (existing) return this.adoptExisting(existing, input.capMicroUsd);
    const user = await this.entitlements.getEnforcedForUser(input.userId);
    if (!user.permissions.includes(Permission.THREAD_GENERATION_USE))
      throw new ForbiddenException('Threads generation is not permitted');
    const reservations: string[] = [];
    let committed = false;
    try {
      for (const feature of THREAD_JOB_REQUIRED_FEATURES) {
        const result = await this.featureUsage.reserve({
          userId: input.userId,
          feature,
          requestId: `${input.requestId}:${feature}`,
        });
        if (!result.allowed) throw threadAllowanceRefusal(feature, result);
        if (result.reservationId) reservations.push(result.reservationId);
      }
      const budget = await this.createOrAdopt(input, reservations);
      // From here the budget (ours or a parallel winner's) owns the plan holds.
      committed = true;
      return this.adoptExisting(budget, input.capMicroUsd);
    } finally {
      // Whatever went wrong (a refusal, a database error), an uncommitted job
      // must not keep the user's plan allowance.
      if (!committed) await this.releaseFeatures(reservations);
    }
  }

  /**
   * Creates the budget, or - when a parallel request with the same key won the
   * create - returns the winner's. The winner holds the SAME plan reservations
   * (they are idempotent per request id), so the loser must not release them.
   */
  private async createOrAdopt(
    input: { userId: string; requestId: string; capMicroUsd: bigint },
    reservations: string[],
  ): Promise<ThreadJobBudget> {
    try {
      return await this.repository.create({ ...input, featureReservationIds: reservations });
    } catch (error) {
      if (!isRetryableTransactionError(error, [PRISMA_UNIQUE_VIOLATION_CODE])) throw error;
      const winner = await this.repository.findByRequest(input.userId, input.requestId);
      if (!winner) throw error;
      return winner;
    }
  }

  private adoptExisting<T extends { capMicroUsd: bigint; status: string }>(
    existing: T,
    capMicroUsd: bigint,
  ): T {
    if (existing.capMicroUsd !== capMicroUsd)
      throw new Error('idempotency key already has a different spend cap');
    if (existing.status !== 'ACTIVE')
      throw new ForbiddenException('Threads budget is already closed');
    return existing;
  }

  /**
   * Reserves one model call. A transient conflict is retried inside the
   * repository; if it still conflicts the caller gets a 503 with
   * THREAD_BUDGET_BUSY_CODE, never an answer that looks like "no money".
   */
  async reserveCall(input: {
    budgetId: string;
    requestId: string;
    creditReservationId: string | null;
    amountMicroUsd: bigint;
  }): Promise<ThreadCallReserveResult> {
    const result = await this.guardBusy(() => this.repository.reserveCall(input));
    if (result.supersededCreditReservationId !== null) {
      await this.releaseCreditHolds([result.supersededCreditReservationId]);
    }
    return result;
  }

  /** What the job has spent so far (the charge counted, not the holds). Read-only. */
  async summary(budgetId: string): Promise<ThreadJobBudgetSummary> {
    const budget = await this.repository.get(budgetId);
    if (!budget) {
      throw new NotFoundException('Threads budget not found');
    }
    return toThreadJobBudgetSummary(budget, await this.freeMeterCharge(budgetId));
  }

  /** The Free meter's charge for the job; progress is better without it than not at all. */
  private async freeMeterCharge(budgetId: string): Promise<bigint> {
    try {
      return await this.freeMeter.chargedMicroUsd(budgetId);
    } catch (error) {
      this.logger.warn(`freeMeterCharge: ${budgetId} reported as 0 - ${String(error)}`);
      return 0n;
    }
  }

  settleCall(budgetId: string, requestId: string, settledMicroUsd: bigint): Promise<boolean> {
    return this.guardBusy(() => this.repository.settleCall(budgetId, requestId, settledMicroUsd));
  }

  releaseCall(budgetId: string, requestId: string): Promise<boolean> {
    return this.guardBusy(() => this.repository.releaseCall(budgetId, requestId));
  }

  /**
   * Closes the job's budget. Calls still in flight are released with it (a
   * cancelled job's model calls are abandoned), their credit holds are given
   * back, and the plan allowance is consumed (FINALIZED) or returned (RELEASED,
   * PLATFORM_FAILED). PLATFORM_FAILED also refunds the money the Free meter charged
   * for the job's finished calls (ADR-162 addendum).
   * Safe to call again: the allowance step and the refund are idempotent, so a close
   * that failed half-way is finished by the retry.
   */
  async close(budgetId: string, status: ThreadJobBudgetCloseStatus): Promise<boolean> {
    const budget = await this.repository.get(budgetId);
    if (!budget) return false;
    if (budget.status !== 'ACTIVE') {
      if (budget.status !== status) return false;
      await this.finishClose(budgetId, budget.featureReservationIds, status);
      return true;
    }
    const result = await this.guardBusy(() => this.repository.close(budgetId, status));
    if (!result.closed) return (await this.repository.get(budgetId))?.status === status;
    await this.releaseCreditHolds(result.releasedCreditReservationIds);
    await this.finishClose(budgetId, budget.featureReservationIds, status);
    return true;
  }

  /**
   * The steps after the budget row is closed. Both are attempted even when the first fails, so
   * a broken meter refund never keeps the user's lifetime allowance hold; the caller is then
   * asked to retry and the idempotent steps finish.
   */
  private async finishClose(
    budgetId: string,
    featureIds: string[],
    status: ThreadJobBudgetCloseStatus,
  ): Promise<void> {
    let refundFailed = false;
    if (status === ThreadJobBudgetCloseStatus.PLATFORM_FAILED) {
      try {
        const refunded = await this.freeMeter.refundFinishedCalls(budgetId);
        if (refunded > 0n) {
          this.logger.log(
            `close: refunded ${String(refunded)} micro-USD of free meter, budget ${budgetId}`,
          );
        }
      } catch (error) {
        refundFailed = true;
        this.logger.error(`close: free meter refund failed for ${budgetId} - ${String(error)}`);
      }
    }
    await this.settleFeatures(featureIds, status);
    if (refundFailed) {
      throw new ServiceUnavailableException({
        code: THREAD_BUDGET_BUSY_CODE,
        message: 'The free allowance could not be refunded yet, retry shortly',
      });
    }
  }

  private async guardBusy<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof SerializationRetryExhaustedError) {
        this.logger.warn(
          `guardBusy: budget still conflicting after ${String(error.attempts)} tries`,
        );
        throw new ServiceUnavailableException({
          code: THREAD_BUDGET_BUSY_CODE,
          message: 'The Threads budget is busy, retry shortly',
        });
      }
      throw error;
    }
  }

  private async releaseCreditHolds(reservationIds: string[]): Promise<void> {
    const results = await Promise.allSettled(
      reservationIds.map((id) => this.credit.release(id, THREAD_BUDGET_CALL_RELEASE_REASON)),
    );
    // A hold that could not be given back is reclaimed by the credit sweeper
    // after its TTL; the budget close must not fail because of it.
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(`releaseCreditHolds: ${String(result.reason)}`);
      }
    }
  }

  private async settleFeatures(ids: string[], status: ThreadJobBudgetCloseStatus): Promise<void> {
    const outcome =
      status === ThreadJobBudgetCloseStatus.FINALIZED
        ? FeatureSettlement.CONSUME
        : FeatureSettlement.RELEASE;
    const results = await Promise.allSettled(
      ids.map((id) => this.featureUsage.settle(id, outcome)),
    );
    if (results.some((result) => result.status === 'rejected')) {
      // The budget is closed already; the caller retries and this step is idempotent.
      throw new ServiceUnavailableException({
        code: THREAD_BUDGET_BUSY_CODE,
        message: 'The plan allowance could not be settled yet, retry shortly',
      });
    }
  }

  private async releaseFeatures(ids: string[]): Promise<void> {
    const results = await Promise.allSettled(
      ids.map((id) => this.featureUsage.settle(id, FeatureSettlement.RELEASE)),
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(`releaseFeatures: ${String(result.reason)}`);
      }
    }
  }
}
