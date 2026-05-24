// SCAFFOLD: stream R.4 (05-r4-cost-budget-intelligence)

import { z } from 'zod';

export const createBudgetSchema = z.object({
  scope: z.enum(['USER', 'ORG']),
  ownerId: z.string().min(1).max(200),
  monthlyCapUsd: z.number().positive().max(1_000_000),
  warnAtPercent: z.number().int().min(1).max(100).default(80),
  overrideAllowed: z.boolean().default(false),
});

export type CreateBudgetDto = z.infer<typeof createBudgetSchema>;
