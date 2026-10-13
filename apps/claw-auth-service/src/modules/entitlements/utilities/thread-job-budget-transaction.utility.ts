import { type ThreadJobBudget, type ThreadJobBudgetCall } from '../../../generated/prisma';
import { ThreadCallReserveOutcome } from '../../credit/enums/thread-call-reserve-outcome.enum';
import {
  type ThreadCallReserveInput,
  type ThreadCallReserveResult,
  type ThreadBudgetTx as Tx,
} from '../types/thread-job-budget.types';

/** Cap minus reserved minus spent, floored at zero. Integer micro-USD only. */
export function remainingBudgetMicroUsd(
  budget: Pick<ThreadJobBudget, 'capMicroUsd' | 'reservedMicroUsd' | 'spentMicroUsd'>,
): bigint {
  const used = budget.reservedMicroUsd + budget.spentMicroUsd;
  return budget.capMicroUsd > used ? budget.capMicroUsd - used : 0n;
}

function answer(
  outcome: ThreadCallReserveOutcome,
  remainingMicroUsd: bigint,
  supersededCreditReservationId: string | null = null,
): ThreadCallReserveResult {
  return { outcome, remainingMicroUsd, supersededCreditReservationId };
}

/**
 * One idempotent reservation, inside the caller's SERIALIZABLE transaction.
 *
 * A request id names one logical call. Asking for it again is therefore
 * answered from the row that already exists instead of being refused:
 * - still RESERVED: the same call (a duplicate or a retry); if the retry carries
 *   a new credit hold or size, the row follows it and the old hold is handed
 *   back to the caller to give back;
 * - FINALIZED or RELEASED with the SAME credit hold: a duplicate of a call that
 *   already ended, answered with a defined outcome;
 * - FINALIZED or RELEASED with a NEW credit hold: a genuine retry of the same
 *   request id (a job attempt that reuses it), so the row is reopened. What it
 *   already spent stays counted and the new spend adds to it.
 */
export async function reserveCallInTransaction(
  tx: Tx,
  input: ThreadCallReserveInput,
): Promise<ThreadCallReserveResult> {
  const budget = await tx.threadJobBudget.findUnique({ where: { id: input.budgetId } });
  if (!budget) {
    return answer(ThreadCallReserveOutcome.BUDGET_NOT_FOUND, 0n);
  }
  const existing = await tx.threadJobBudgetCall.findUnique({
    where: { budgetId_requestId: { budgetId: input.budgetId, requestId: input.requestId } },
  });
  if (existing) {
    return reuseExistingCall(tx, budget, existing, input);
  }
  const remaining = remainingBudgetMicroUsd(budget);
  if (budget.status !== 'ACTIVE') {
    return answer(ThreadCallReserveOutcome.BUDGET_CLOSED, remaining);
  }
  if (input.amountMicroUsd > remaining) {
    return answer(ThreadCallReserveOutcome.CAP_EXCEEDED, remaining);
  }
  const updated = await tx.threadJobBudget.updateMany({
    where: { id: budget.id, status: 'ACTIVE' },
    data: { reservedMicroUsd: { increment: input.amountMicroUsd } },
  });
  if (updated.count !== 1) {
    return answer(ThreadCallReserveOutcome.BUDGET_CLOSED, remaining);
  }
  await tx.threadJobBudgetCall.create({
    data: {
      budgetId: input.budgetId,
      requestId: input.requestId,
      creditReservationId: input.creditReservationId,
      reservedMicroUsd: input.amountMicroUsd,
      status: 'RESERVED',
    },
  });
  return answer(ThreadCallReserveOutcome.RESERVED, remaining - input.amountMicroUsd);
}

async function reuseExistingCall(
  tx: Tx,
  budget: ThreadJobBudget,
  existing: ThreadJobBudgetCall,
  input: ThreadCallReserveInput,
): Promise<ThreadCallReserveResult> {
  const remaining = remainingBudgetMicroUsd(budget);
  const sameHold = existing.creditReservationId === input.creditReservationId;
  if (existing.status === 'RESERVED') {
    const unchanged = sameHold && existing.reservedMicroUsd === input.amountMicroUsd;
    return unchanged
      ? answer(ThreadCallReserveOutcome.ALREADY_RESERVED, remaining)
      : resizeCall(tx, budget, existing, input, existing.reservedMicroUsd);
  }
  if (sameHold) {
    return answer(
      existing.status === 'FINALIZED'
        ? ThreadCallReserveOutcome.ALREADY_FINALIZED
        : ThreadCallReserveOutcome.ALREADY_RELEASED,
      remaining,
    );
  }
  return budget.status === 'ACTIVE'
    ? resizeCall(tx, budget, existing, input, 0n)
    : answer(ThreadCallReserveOutcome.BUDGET_CLOSED, remaining);
}

/**
 * Points an existing row at the new hold and size. `heldBefore` is what the row
 * already counted in the budget's reserved total (zero for a reopened row).
 */
async function resizeCall(
  tx: Tx,
  budget: ThreadJobBudget,
  existing: ThreadJobBudgetCall,
  input: ThreadCallReserveInput,
  heldBefore: bigint,
): Promise<ThreadCallReserveResult> {
  const remaining = remainingBudgetMicroUsd(budget);
  const growth = input.amountMicroUsd - heldBefore;
  if (growth > remaining) {
    return answer(ThreadCallReserveOutcome.CAP_EXCEEDED, remaining);
  }
  const updated = await tx.threadJobBudget.updateMany({
    where: { id: budget.id, status: 'ACTIVE' },
    data: { reservedMicroUsd: { increment: growth } },
  });
  if (updated.count !== 1) {
    return answer(ThreadCallReserveOutcome.BUDGET_CLOSED, remaining);
  }
  await tx.threadJobBudgetCall.update({
    where: { id: existing.id },
    data: {
      status: 'RESERVED',
      creditReservationId: input.creditReservationId,
      reservedMicroUsd: input.amountMicroUsd,
      settledAt: null,
    },
  });
  const replaced =
    existing.creditReservationId !== null &&
    existing.creditReservationId !== input.creditReservationId &&
    existing.status === 'RESERVED'
      ? existing.creditReservationId
      : null;
  return answer(ThreadCallReserveOutcome.RESERVED, remaining - growth, replaced);
}

/** Moves a RESERVED call to FINALIZED; its spend accumulates across reopenings. */
export async function settleCallRow(
  tx: Tx,
  call: ThreadJobBudgetCall,
  settledMicroUsd: bigint,
): Promise<void> {
  await tx.threadJobBudgetCall.update({
    where: { id: call.id },
    data: {
      status: 'FINALIZED',
      settledMicroUsd: (call.settledMicroUsd ?? 0n) + settledMicroUsd,
      settledAt: new Date(),
    },
  });
  await tx.threadJobBudget.update({
    where: { id: call.budgetId },
    data: {
      reservedMicroUsd: { decrement: call.reservedMicroUsd },
      spentMicroUsd: { increment: settledMicroUsd },
    },
  });
}
