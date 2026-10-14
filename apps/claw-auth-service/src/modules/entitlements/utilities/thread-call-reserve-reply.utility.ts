import { ThreadCallReserveOutcome } from '../../credit/enums/thread-call-reserve-outcome.enum';
import { type ThreadJobBudget } from '../../../generated/prisma';
import {
  type ThreadCallReserveReply,
  type ThreadCallReserveResult,
  type ThreadJobBudgetSummary,
} from '../types/thread-job-budget.types';
import { remainingBudgetMicroUsd } from './thread-job-budget-transaction.utility';

function toSafeNumber(value: bigint): number {
  const ceiling = BigInt(Number.MAX_SAFE_INTEGER);
  return Number(value > ceiling ? ceiling : value);
}

/** The job's spend as the generation service shows it: the CHARGE counted so far, not the holds. */
export function toThreadJobBudgetSummary(budget: ThreadJobBudget): ThreadJobBudgetSummary {
  return {
    status: budget.status,
    capMicroUsd: toSafeNumber(budget.capMicroUsd),
    reservedMicroUsd: toSafeNumber(budget.reservedMicroUsd),
    spentMicroUsd: toSafeNumber(budget.spentMicroUsd),
    settledMicroUsd: toSafeNumber(budget.spentMicroUsd),
    remainingMicroUsd: toSafeNumber(remainingBudgetMicroUsd(budget)),
  };
}

/** True only for the two outcomes that let the model call proceed. */
export function isThreadCallProceedable(outcome: ThreadCallReserveOutcome): boolean {
  return (
    outcome === ThreadCallReserveOutcome.RESERVED ||
    outcome === ThreadCallReserveOutcome.ALREADY_RESERVED
  );
}

/**
 * The wire answer: the bare boolean an older meter understands, or, when the caller
 * asked for it, the outcome that says WHY a call was refused.
 */
export function toThreadCallReserveReply(
  result: ThreadCallReserveResult,
  detailed: boolean,
): boolean | ThreadCallReserveReply {
  const reserved = isThreadCallProceedable(result.outcome);
  if (!detailed) {
    return reserved;
  }
  const safeCeiling = BigInt(Number.MAX_SAFE_INTEGER);
  return {
    reserved,
    outcome: result.outcome,
    remainingMicroUsd: Number(
      result.remainingMicroUsd > safeCeiling ? safeCeiling : result.remainingMicroUsd,
    ),
  };
}
