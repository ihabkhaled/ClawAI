import { creditTopupSnapshotSchema } from '../schemas/credit-topup-snapshot.schema';
import { type CreditTopupPriceSnapshot } from '../types/credit-topup-lifecycle.types';

/**
 * Reads the frozen package binding back off a CREDIT_TOPUP charge.
 *
 * Returns null rather than throwing when the column is absent or malformed: the
 * caller's correct response is to refuse the reversal and surface a reference
 * mismatch, not to guess at how much credit to claw back. Reversing a guessed
 * figure is worse than refusing — one is an operator ticket, the other is a
 * customer's balance quietly wrong.
 */
export function readCreditTopupSnapshot(value: unknown): CreditTopupPriceSnapshot | null {
  const parsed = creditTopupSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * The credit that returned money bought.
 *
 * A full reversal returns exactly the credit the package granted; a partial
 * refund returns the proportional share. BigInt throughout and FLOOR division,
 * so a rounding remainder always favours the platform's ledger staying solvent
 * rather than reversing a micro-USD the customer's money never paid for.
 *
 * This is deliberately NOT clamped against the wallet. payment-service cannot
 * see a balance; auth clamps to the unspent PURCHASED bucket and reports the
 * shortfall as `CREDIT_REVERSAL_EXCEEDS_UNSPENT` (ADR-083 edge case E5).
 */
export function proportionalCreditMicroUsd(
  grantedMicroUsd: bigint,
  reversedAmountMinor: number,
  chargedAmountMinor: number,
): bigint {
  if (grantedMicroUsd <= 0n || reversedAmountMinor <= 0 || chargedAmountMinor <= 0) {
    return 0n;
  }
  if (reversedAmountMinor >= chargedAmountMinor) {
    return grantedMicroUsd;
  }
  return (grantedMicroUsd * BigInt(reversedAmountMinor)) / BigInt(chargedAmountMinor);
}
