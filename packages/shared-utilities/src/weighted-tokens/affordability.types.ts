import type { ModelCostRates } from '@claw/shared-types';

/**
 * Everything needed to decide how long an answer this user can afford.
 *
 * `balanceMicroUsd` is a `number`, not a `bigint`, because it has already been
 * bounded by the caller: a wallet balance that exceeded `Number.MAX_SAFE_INTEGER`
 * micro-USD would be over nine billion dollars, and the reservation path rejects
 * that long before this function sees it.
 */
export type AffordabilityInput = {
  rates: ModelCostRates;
  balanceMicroUsd: number;
  promptTokens: number;
  cachedPromptTokens: number;
  /** The ceiling the caller would have used if money were no object. */
  requestedMaxOutputTokens: number;
  /**
   * Below this the answer is too short to be worth spending the user's last
   * cents on — better to refuse and tell them to top up than to hand back two
   * sentences and an empty wallet.
   */
  minViableOutputTokens: number;
  /**
   * Artifacts this request will produce that are priced per unit rather than per
   * token — images, today.
   *
   * Their cost is fixed and known BEFORE the call, so it is subtracted from the
   * balance up front like the prompt. Leaving it out is what made an image
   * generation reserve $0 and then settle against a wallet that had already been
   * spent elsewhere.
   */
  imageUnits?: number;
};

/**
 * The outcome of clamping. `AFFORDABLE` carries the (possibly reduced) ceiling
 * to send to the provider; the other two are terminal.
 *
 * `clamped` distinguishes "you got what you asked for" from "you got a shorter
 * answer because of your balance" — the second is a thing the user must be told,
 * not a silent degradation.
 */
export type AffordabilityOutcome =
  | {
      status: 'AFFORDABLE';
      maxOutputTokens: number;
      clamped: boolean;
      /** Worst-case cost of the clamped request. Guaranteed ≤ balance. */
      worstCaseCostMicroUsd: number;
    }
  | {
      /** The prompt alone costs more than the balance — nothing can be sent. */
      status: 'PROMPT_UNAFFORDABLE';
      promptCostMicroUsd: number;
    }
  | {
      /** The prompt fits but leaves too little for a usable answer. */
      status: 'OUTPUT_UNAFFORDABLE';
      affordableOutputTokens: number;
    };
