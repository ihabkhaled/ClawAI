import { z } from 'zod';
import { ThreadJobBudgetCloseStatus } from '../../credit/enums/thread-job-budget-close-status.enum';

export const threadJobBudgetReserveSchema = z.object({
  userId: z.string().min(1).max(128),
  requestId: z.string().min(1).max(200),
  capMicroUsd: z.number().int().safe().nonnegative(),
});
export const threadJobBudgetCallSchema = z.object({
  budgetId: z.string().min(1).max(64),
  requestId: z.string().min(1).max(200),
  creditReservationId: z.string().uuid().nullable(),
  amountMicroUsd: z.number().int().safe().nonnegative(),
  // A caller that asks for the detailed answer gets the outcome and what is left of the cap;
  // one that does not gets the boolean it always got, so an older meter keeps working.
  detailed: z.boolean().optional(),
});
export const threadJobBudgetSettleSchema = z.object({
  budgetId: z.string().min(1).max(64),
  requestId: z.string().min(1).max(200),
  settledMicroUsd: z.number().int().safe().nonnegative(),
});
export const threadJobBudgetReleaseSchema = z.object({
  budgetId: z.string().min(1).max(64),
  requestId: z.string().min(1).max(200),
});
export const threadJobBudgetSummarySchema = z.object({
  budgetId: z.string().min(1).max(64),
});
export const threadJobBudgetCloseSchema = z.object({
  budgetId: z.string().min(1).max(64),
  status: z.nativeEnum(ThreadJobBudgetCloseStatus),
});
