import { z } from 'zod';

export const overviewQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((value) => value === 1 || value === 7 || value === 30, 'days must be 1, 7 or 30')
    .default(1),
});

export const runIdParamSchema = z.string().min(1).max(64);

export type OverviewQuery = z.infer<typeof overviewQuerySchema>;
