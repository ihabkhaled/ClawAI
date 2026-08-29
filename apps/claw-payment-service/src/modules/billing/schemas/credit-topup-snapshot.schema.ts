import { z } from 'zod';

/**
 * The package binding frozen onto a CREDIT_TOPUP charge.
 *
 * Validated on the way BACK out, not only on the way in. The column is JSON, a
 * row can have been written by an older build, and this figure decides how much
 * credit a refund claws out of a customer's wallet — so it is parsed with the
 * same suspicion as an inbound gateway payload.
 *
 * `creditMicroUsd` is a decimal STRING. JSON has no BigInt, and a number here
 * would already have been rounded before it arrived; reversing a rounded figure
 * is a wallet quietly wrong.
 */
export const creditTopupSnapshotSchema = z.object({
  packageId: z.string().min(1).max(64),
  packageVersionId: z.string().min(1).max(64),
  creditMicroUsd: z.string().regex(/^\d+$/u).max(19),
  amountMinor: z.number().int().nonnegative(),
  currency: z.string().length(3),
});
