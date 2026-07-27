import { z } from 'zod';

export const billingDashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type BillingDashboardQuery = z.infer<typeof billingDashboardQuerySchema>;

export const priceVersionCountsQuerySchema = z.object({
  planId: z.string().min(1).max(64),
});

export type PriceVersionCountsQuery = z.infer<typeof priceVersionCountsQuerySchema>;
