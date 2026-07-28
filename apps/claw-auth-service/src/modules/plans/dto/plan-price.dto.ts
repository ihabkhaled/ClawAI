import { z } from 'zod';

import { BillingIntervalKind } from '../../../generated/prisma';

export const publishPlanPriceSchema = z.object({
  billingInterval: z.nativeEnum(BillingIntervalKind),
  currency: z.enum(['USD', 'EUR', 'EGP']),
  amountMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});

export type PublishPlanPriceDto = z.infer<typeof publishPlanPriceSchema>;
