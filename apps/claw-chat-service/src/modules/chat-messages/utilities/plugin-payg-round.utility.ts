import type { PaygCallOptions } from '../types/payg.types';

/**
 * The billing options for model round N of a plugin tool loop.
 *
 * Round 0 is the caller's own call and keeps its options untouched, including a
 * hold the caller took up front. Every later round is a distinct paid call: it
 * needs its own idempotency key, and it must not reuse a hold that the first
 * round already settled, or N paid rounds would bill as one (payg.types.ts).
 */
export function paygForPluginRound(
  base: PaygCallOptions | undefined,
  round: number,
): PaygCallOptions | undefined {
  if (round === 0 || base === undefined) return base;
  const { hold: _spent, ...rest } = base;
  return {
    ...rest,
    ...(base.requestId === undefined
      ? {}
      : { requestId: `${base.requestId}:plugin-r${String(round)}` }),
  };
}
