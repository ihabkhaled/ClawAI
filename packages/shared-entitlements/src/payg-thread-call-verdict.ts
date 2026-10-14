import { BillingErrorCode } from '@claw/shared-types';

import { type PaygThreadCallVerdict } from './payg-meter.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const SPEND_CAP_OUTCOMES: readonly string[] = ['CAP_EXCEEDED', 'BUDGET_CLOSED', 'BUDGET_NOT_FOUND'];

/**
 * Reads auth-service's answer to "may this Threads call run against its job
 * budget?" into a verdict the meter can act on.
 *
 * Two wire shapes, because an auth-service older than this meter answers a bare
 * boolean and a newer one answers the outcome. FAILS CLOSED: anything this does
 * not recognise refuses the call, and never as the user's empty wallet.
 * - allowed: the call proceeds;
 * - the job's cap is used up, or its budget is closed: `PAYG_CREDIT_EXHAUSTED`
 *   with what is left of the cap (nothing);
 * - the cap still has money but less than this call's hold: `PAYG_CAP_TOO_LOW`
 *   with the cap left, so the owner is told to raise the cap, not to top up;
 * - a duplicate of a call that already ended, or a reply that cannot be read:
 *   `PAYG_PRICING_UNAVAILABLE`, the temporary "could not be checked" answer.
 */
export function readThreadCallVerdict(payload: unknown): PaygThreadCallVerdict {
  if (payload === true) {
    return { reserved: true };
  }
  if (payload === false) {
    return {
      reserved: false,
      errorCode: BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
      remainingMicroUsd: 0,
    };
  }
  if (!isRecord(payload) || typeof payload['reserved'] !== 'boolean') {
    return {
      reserved: false,
      errorCode: BillingErrorCode.PAYG_PRICING_UNAVAILABLE,
      remainingMicroUsd: 0,
    };
  }
  if (payload['reserved']) {
    return { reserved: true };
  }
  const outcome = payload['outcome'];
  const remaining = payload['remainingMicroUsd'];
  const isCapRefusal = typeof outcome === 'string' && SPEND_CAP_OUTCOMES.includes(outcome);
  const remainingMicroUsd =
    typeof remaining === 'number' && Number.isSafeInteger(remaining) && remaining > 0
      ? remaining
      : 0;
  if (!isCapRefusal) {
    return {
      reserved: false,
      errorCode: BillingErrorCode.PAYG_PRICING_UNAVAILABLE,
      remainingMicroUsd,
    };
  }
  return {
    reserved: false,
    errorCode:
      outcome === 'CAP_EXCEEDED' && remainingMicroUsd > 0
        ? BillingErrorCode.PAYG_CAP_TOO_LOW
        : BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
    remainingMicroUsd,
  };
}
