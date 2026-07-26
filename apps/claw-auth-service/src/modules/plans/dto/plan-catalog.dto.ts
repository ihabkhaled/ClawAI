import { z } from 'zod';

import { BillingIntervalKind } from '../../../generated/prisma';

// Every string is length-bounded. An unbounded id in a query string is a cheap
// way to push megabytes through validation and into a database index lookup.
export const activePriceQuerySchema = z.object({
  planId: z.string().min(1).max(64),
  billingInterval: z.nativeEnum(BillingIntervalKind),
});

export type ActivePriceQueryDto = z.infer<typeof activePriceQuerySchema>;

export const priceVersionParamSchema = z.object({
  id: z.string().min(1).max(64),
});

export type PriceVersionParamDto = z.infer<typeof priceVersionParamSchema>;
