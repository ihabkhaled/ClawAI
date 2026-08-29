import { type CreditBucketSplit } from '../types/credit.types';

/**
 * Splits a debit across the wallet, GRANT first.
 *
 * The order is a commitment to the customer, not an optimisation. GRANT expires
 * at the end of the period and PURCHASED never does, so spending PURCHASED
 * first would silently destroy allowance the user had already been given. The
 * inverse mistake is far worse than an accounting quirk: it is money the
 * customer paid for, consumed while a free balance sat unused.
 *
 * Caps at what each bucket actually holds and returns the split, which may
 * total LESS than `amountMicroUsd` when the wallet cannot cover it. The caller
 * decides what an under-covered debit means — the reservation gate refuses,
 * while a settlement charges what is there and records the shortfall.
 */
export function splitDebitAcrossBuckets(
  amountMicroUsd: bigint,
  grantMicroUsd: bigint,
  purchasedMicroUsd: bigint,
): CreditBucketSplit {
  const wanted = amountMicroUsd > 0n ? amountMicroUsd : 0n;
  const grantCap = grantMicroUsd > 0n ? grantMicroUsd : 0n;
  const purchasedCap = purchasedMicroUsd > 0n ? purchasedMicroUsd : 0n;

  const fromGrant = wanted < grantCap ? wanted : grantCap;
  const remainder = wanted - fromGrant;
  const fromPurchased = remainder < purchasedCap ? remainder : purchasedCap;

  return { grantMicroUsd: fromGrant, purchasedMicroUsd: fromPurchased };
}

/**
 * Splits a refund across the wallet, PURCHASED first, capped by what each
 * bucket originally supplied.
 *
 * PURCHASED first is the mirror of the debit rule and exists for the same
 * reason: returning cash as a bucket that expires at the end of the month would
 * quietly confiscate it.
 *
 * The caps are what makes this safe to use for BOTH a partial reconciliation
 * refund and a full release. Given a full refund (`amount` equal to the sum of
 * the caps) it reproduces the original split exactly, so releasing a hold gives
 * each bucket back precisely what that bucket lent — a release must never
 * launder perishable grant into permanent credit.
 */
export function splitRefundAcrossBuckets(
  amountMicroUsd: bigint,
  purchasedCapMicroUsd: bigint,
  grantCapMicroUsd: bigint,
): CreditBucketSplit {
  const wanted = amountMicroUsd > 0n ? amountMicroUsd : 0n;
  const purchasedCap = purchasedCapMicroUsd > 0n ? purchasedCapMicroUsd : 0n;
  const grantCap = grantCapMicroUsd > 0n ? grantCapMicroUsd : 0n;

  const toPurchased = wanted < purchasedCap ? wanted : purchasedCap;
  const remainder = wanted - toPurchased;
  const toGrant = remainder < grantCap ? remainder : grantCap;

  return { grantMicroUsd: toGrant, purchasedMicroUsd: toPurchased };
}

/**
 * `grant + purchased − reserved`, floored at zero.
 *
 * Net of holds on purpose: this is the number the reservation gate compares
 * against, so showing the gross balance anywhere would let the UI promise money
 * the next request cannot actually spend.
 */
export function availableMicroUsd(
  grantMicroUsd: bigint,
  purchasedMicroUsd: bigint,
  reservedMicroUsd: bigint,
): bigint {
  const net = grantMicroUsd + purchasedMicroUsd - reservedMicroUsd;
  return net > 0n ? net : 0n;
}

/**
 * Narrows a BigInt balance to the `number` the affordability clamp takes.
 *
 * The clamp works in `number` because a wallet above `Number.MAX_SAFE_INTEGER`
 * micro-USD would be over nine billion dollars. Clamping here rather than
 * asserting keeps an absurd balance from throwing on the money path — it simply
 * stops being the binding constraint, which is the correct behaviour for a
 * balance that large.
 */
export function toSafeBalanceNumber(value: bigint): number {
  const ceiling = BigInt(Number.MAX_SAFE_INTEGER);
  if (value >= ceiling) {
    return Number.MAX_SAFE_INTEGER;
  }
  return value > 0n ? Number(value) : 0;
}
