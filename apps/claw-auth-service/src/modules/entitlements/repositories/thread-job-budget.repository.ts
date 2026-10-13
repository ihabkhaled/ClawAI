import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type ThreadJobBudget, type ThreadJobBudgetState } from '../../../generated/prisma';
import {
  PRISMA_UNIQUE_VIOLATION_CODE,
  THREAD_BUDGET_TX_OPTIONS as SERIALIZABLE,
} from '../constants/thread-job-budget-retry.constants';
import {
  type RetryOptions,
  type ThreadBudgetCloseResult,
  type ThreadCallReserveInput,
  type ThreadCallReserveResult,
} from '../types/thread-job-budget.types';
import { retryOnSerializationFailure } from '../utilities/serializable-retry.utility';
import {
  reserveCallInTransaction,
  settleCallRow,
} from '../utilities/thread-job-budget-transaction.utility';

/**
 * Every transaction here runs SERIALIZABLE on one budget row, so concurrent
 * authors of the same job are expected to conflict. Each is wrapped in a
 * bounded retry with jittered backoff; only a transaction that still conflicts
 * after every attempt surfaces (as `SerializationRetryExhaustedError`).
 */
@Injectable()
export class ThreadJobBudgetRepository {
  /** Backoff tuning; the defaults are right for production, a test makes it instant. */
  retryTuning: RetryOptions = {};

  constructor(private readonly prisma: PrismaService) {}

  private retry<T>(work: () => Promise<T>, extraCodes: readonly string[] = []): Promise<T> {
    return retryOnSerializationFailure(work, { ...this.retryTuning, extraCodes });
  }

  findByRequest(userId: string, requestId: string): Promise<ThreadJobBudget | null> {
    return this.prisma.threadJobBudget.findUnique({
      where: { userId_requestId: { userId, requestId } },
    });
  }

  create(input: {
    userId: string;
    requestId: string;
    capMicroUsd: bigint;
    featureReservationIds: string[];
  }): Promise<ThreadJobBudget> {
    return this.prisma.threadJobBudget.create({ data: input });
  }

  reserveCall(input: ThreadCallReserveInput): Promise<ThreadCallReserveResult> {
    // A unique violation is a lost create race for the same request id: running
    // again finds the winner's row and answers from it.
    return this.retry(
      () => this.prisma.$transaction((tx) => reserveCallInTransaction(tx, input), SERIALIZABLE),
      [PRISMA_UNIQUE_VIOLATION_CODE],
    );
  }

  /** Settles a call at the amount the caller reports. Already-settled is a no-op that succeeds. */
  settleCall(budgetId: string, requestId: string, settledMicroUsd: bigint): Promise<boolean> {
    return this.retry(() =>
      this.prisma.$transaction(async (tx) => {
        const call = await tx.threadJobBudgetCall.findUnique({
          where: { budgetId_requestId: { budgetId, requestId } },
        });
        if (!call) return false;
        if (call.status === 'FINALIZED') return true;
        if (call.status !== 'RESERVED' || settledMicroUsd > call.reservedMicroUsd) return false;
        await settleCallRow(tx, call, settledMicroUsd);
        return true;
      }, SERIALIZABLE),
    );
  }

  /**
   * Settles the call that carries this credit hold at what the user was really
   * charged. Capped at the call's own hold, so a charge can never exceed it.
   */
  settleByCreditReservation(
    creditReservationId: string,
    chargedMicroUsd: bigint,
  ): Promise<boolean> {
    return this.retry(() =>
      this.prisma.$transaction(async (tx) => {
        const call = await tx.threadJobBudgetCall.findUnique({ where: { creditReservationId } });
        if (call?.status !== 'RESERVED') return false;
        const amount =
          chargedMicroUsd < call.reservedMicroUsd ? chargedMicroUsd : call.reservedMicroUsd;
        await settleCallRow(tx, call, amount < 0n ? 0n : amount);
        return true;
      }, SERIALIZABLE),
    );
  }

  /** Gives a call's hold back. Already-released is a no-op that succeeds. */
  releaseCall(budgetId: string, requestId: string): Promise<boolean> {
    return this.retry(() =>
      this.prisma.$transaction(async (tx) => {
        const call = await tx.threadJobBudgetCall.findUnique({
          where: { budgetId_requestId: { budgetId, requestId } },
        });
        if (!call) return false;
        if (call.status === 'RELEASED') return true;
        if (call.status !== 'RESERVED') return false;
        await tx.threadJobBudgetCall.update({
          where: { id: call.id },
          data: { status: 'RELEASED', settledAt: new Date() },
        });
        await tx.threadJobBudget.update({
          where: { id: budgetId },
          data: { reservedMicroUsd: { decrement: call.reservedMicroUsd } },
        });
        return true;
      }, SERIALIZABLE),
    );
  }

  /**
   * Closes an ACTIVE budget and, in the same transaction, releases every call
   * still in flight. A cancelled job's model calls are abandoned, not awaited:
   * leaving them RESERVED kept the budget ACTIVE for ever. Returns their credit
   * holds so the caller can give the money back.
   */
  close(budgetId: string, status: ThreadJobBudgetState): Promise<ThreadBudgetCloseResult> {
    return this.retry(() =>
      this.prisma.$transaction(async (tx) => {
        const flipped = await tx.threadJobBudget.updateMany({
          where: { id: budgetId, status: 'ACTIVE' },
          data: { status, settledAt: new Date() },
        });
        if (flipped.count === 0) {
          return { closed: false, releasedCreditReservationIds: [] };
        }
        const inFlight = await tx.threadJobBudgetCall.findMany({
          where: { budgetId, status: 'RESERVED' },
        });
        if (inFlight.length > 0) {
          const held = inFlight.reduce((sum, call) => sum + call.reservedMicroUsd, 0n);
          await tx.threadJobBudgetCall.updateMany({
            where: { id: { in: inFlight.map((call) => call.id) }, status: 'RESERVED' },
            data: { status: 'RELEASED', settledAt: new Date() },
          });
          await tx.threadJobBudget.update({
            where: { id: budgetId },
            data: { reservedMicroUsd: { decrement: held } },
          });
        }
        return {
          closed: true,
          releasedCreditReservationIds: inFlight.flatMap((call) =>
            call.creditReservationId === null ? [] : [call.creditReservationId],
          ),
        };
      }, SERIALIZABLE),
    );
  }

  get(budgetId: string): Promise<ThreadJobBudget | null> {
    return this.prisma.threadJobBudget.findUnique({ where: { id: budgetId } });
  }

  /** ACTIVE budgets created before `cutoff`: their job died without closing them. */
  findStaleActive(cutoff: Date, limit: number): Promise<{ id: string }[]> {
    return this.prisma.threadJobBudget.findMany({
      where: { status: 'ACTIVE', createdAt: { lt: cutoff } },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });
  }

  /**
   * Plan-feature holds still RESERVED although their budget closed before
   * `cutoff` (the process died between closing the budget and settling them).
   */
  async findStrandedFeatureReservationIds(cutoff: Date, limit: number): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT f.id
      FROM feature_usage_records f
      WHERE f.state = 'RESERVED'
        AND EXISTS (
          SELECT 1 FROM thread_job_budgets b
          WHERE f.id = ANY (b.feature_reservation_ids)
            AND b.status <> 'ACTIVE'
            AND b.settled_at < ${cutoff}
        )
      ORDER BY f.reserved_at ASC
      LIMIT ${limit}
    `;
    return rows.map((row) => row.id);
  }
}
