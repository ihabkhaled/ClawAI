import {
  PAYG_ADJUSTMENT_REASON_MAX_LENGTH,
  PAYG_ADJUSTMENT_REASON_MIN_LENGTH,
  PAYG_MAX_ADMIN_ADJUSTMENT_MICRO_USD,
} from '@claw/shared-constants';
import { z } from 'zod';

import {
  CREDIT_PACKAGE_PRICE_MINOR_MAX,
  CREDIT_PACKAGE_SLUG_MAX_LENGTH,
} from '../constants/credit.constants';

/**
 * An operator credit or debit.
 *
 * Bounded in BOTH directions by `PAYG_MAX_ADMIN_ADJUSTMENT_MICRO_USD` so a
 * fat-fingered extra zero cannot mint a fortune, and a `reason` of real length
 * is mandatory: an unattributed adjustment is indistinguishable from a
 * fabricated payment when finance asks where a balance came from.
 */
export const adjustCreditSchema = z.object({
  amountMicroUsd: z
    .number()
    .int()
    .min(-PAYG_MAX_ADMIN_ADJUSTMENT_MICRO_USD)
    .max(PAYG_MAX_ADMIN_ADJUSTMENT_MICRO_USD),
  reason: z.string().min(PAYG_ADJUSTMENT_REASON_MIN_LENGTH).max(PAYG_ADJUSTMENT_REASON_MAX_LENGTH),
});
export type AdjustCreditDto = z.infer<typeof adjustCreditSchema>;

export const createCreditPackageSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(CREDIT_PACKAGE_SLUG_MAX_LENGTH)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'slug must be lowercase kebab-case'),
  displayOrder: z.number().int().min(0).max(1000).default(0),
});
export type CreateCreditPackageDto = z.infer<typeof createCreditPackageSchema>;

/**
 * A NEW immutable price version.
 *
 * `priceMinor` and `creditMicroUsd` are independent inputs, never derived from
 * one another: the ratio between them is the platform's margin on a top-up, and
 * computing one from the other in code would freeze that decision into a
 * deploy instead of leaving it with the operator.
 */
export const publishCreditPackageVersionSchema = z.object({
  priceMinor: z.number().int().min(1).max(CREDIT_PACKAGE_PRICE_MINOR_MAX),
  currency: z.string().min(3).max(3).default('USD'),
  creditMicroUsd: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
});
export type PublishCreditPackageVersionDto = z.infer<typeof publishCreditPackageVersionSchema>;

export const creditPackageParamSchema = z.object({
  id: z.string().min(1).max(64),
});
export type CreditPackageParamDto = z.infer<typeof creditPackageParamSchema>;
