// SCAFFOLD: stream R.4 (05-r4-cost-budget-intelligence)

import { z } from 'zod';

export const updateBudgetSchema = z.object({
  monthlyCapUsd: z.number().positive().max(1_000_000).optional(),
  warnAtPercent: z.number().int().min(1).max(100).optional(),
  overrideAllowed: z.boolean().optional(),
});

export type UpdateBudgetDto = z.infer<typeof updateBudgetSchema>;
