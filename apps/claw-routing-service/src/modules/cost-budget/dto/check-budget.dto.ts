// SCAFFOLD: stream R.4 (05-r4-cost-budget-intelligence)

import { z } from 'zod';

export const checkBudgetSchema = z.object({
  userId: z.string().min(1).max(200),
  orgId: z.string().max(200).optional(),
  estimatedCostUsd: z.number().nonnegative().max(10_000),
});

export type CheckBudgetDto = z.infer<typeof checkBudgetSchema>;
