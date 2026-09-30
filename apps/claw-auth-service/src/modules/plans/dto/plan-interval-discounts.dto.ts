import { z } from 'zod';

import { MAX_INTERVAL_DISCOUNT_BPS } from '../constants/plan-interval-pricing.constants';

const discountBps = z.number().int().min(0).max(MAX_INTERVAL_DISCOUNT_BPS);

export const setPlanIntervalDiscountsSchema = z.object({
  quarterlyDiscountBps: discountBps,
  semiannualDiscountBps: discountBps,
  yearlyDiscountBps: discountBps,
});

export type SetPlanIntervalDiscountsDto = z.infer<typeof setPlanIntervalDiscountsSchema>;
