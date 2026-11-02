import type { UserEntitlements } from '@claw/shared-entitlements';
import { BillingErrorCode } from '@claw/shared-types';

import { BusinessException } from '../../../common/errors';
import { CreditFallbackReason } from '../enums/credit-fallback-reason.enum';
import type { CreditFallbackNotice, CreditRefusalRecord } from '../types/credit-fallback.types';
import { isPaygExemptProvider } from './payg-metering.utility';

/** Why a credit model was refused, as one stable word the bubble can translate. */
export function creditFallbackReason(error: unknown): CreditFallbackReason {
  const code = error instanceof BusinessException ? error.code : '';
  if (code === String(BillingErrorCode.PAYG_FREE_ALLOWANCE_EXHAUSTED)) {
    return CreditFallbackReason.FREE_ALLOWANCE_EXHAUSTED;
  }
  if (code === String(BillingErrorCode.PAYG_MODEL_NOT_IN_FREE_ALLOWANCE)) {
    return CreditFallbackReason.MODEL_NOT_IN_FREE_ALLOWANCE;
  }
  return code === String(BillingErrorCode.PAYG_PROMPT_TOO_EXPENSIVE)
    ? CreditFallbackReason.PROMPT_TOO_EXPENSIVE
    : CreditFallbackReason.CREDIT_EXHAUSTED;
}

/**
 * Remembers the FIRST credit refusal of a turn (the model the user wanted), so a
 * later answer from an included model can say what happened.
 */
export function noteCreditRefusal(
  previous: CreditRefusalRecord | null,
  candidate: { provider: string; model: string },
  error: unknown,
): CreditRefusalRecord {
  return (
    previous ?? {
      originalProvider: candidate.provider,
      originalModel: candidate.model,
      reason: creditFallbackReason(error),
    }
  );
}

/**
 * Spread into a successful response: set only when a credit model was refused AND
 * an included (no-credit) model answered instead, so the bubble can tell the user
 * their credit was not used. Never set for an answer that itself spent credit.
 */
export function creditFallbackPart(
  refusal: CreditRefusalRecord | null,
  answered: { provider: string },
): { creditFallback?: CreditFallbackNotice } {
  return refusal === null || !isPaygExemptProvider(answered.provider)
    ? {}
    : { creditFallback: { ...refusal } };
}

/**
 * True when the refusal is about THIS model or prompt only, so a cheaper credit model may still
 * be allowed: a prompt that is dear, or a model above the free plan's price limit. Credit or free
 * requests being gone refuses every credit model, so those are not.
 */
export function refusalSparesCheaperModels(reason: CreditFallbackReason): boolean {
  return (
    reason === CreditFallbackReason.PROMPT_TOO_EXPENSIVE ||
    reason === CreditFallbackReason.MODEL_NOT_IN_FREE_ALLOWANCE
  );
}

/**
 * Once a refusal says the credit or free requests are gone (not just that this
 * prompt is dear), every other credit model would be refused the same way, so
 * only included models are worth dialling. A price refusal leaves cheaper credit
 * models in play.
 */
export function skipsMeteredAfterRefusal(
  creditGone: boolean,
  candidate: { provider: string },
): boolean {
  return creditGone && !isPaygExemptProvider(candidate.provider);
}

/**
 * The user's choice for a used-up credit model (ADR-161): only an explicit 'STOP' ends the turn
 * with the credit refusal. Absent or 'FALLBACK' keeps today's behaviour (an included model answers).
 */
export function creditFallbackStops(mode: UserEntitlements['creditFallbackMode']): boolean {
  return mode === 'STOP';
}

/**
 * Under STOP, once a credit refusal is recorded no further candidate is dialled, so the chain
 * ends on the ORIGINAL refusal (the upgrade notice, 402) and never on a substitute's answer.
 */
export function skipsAfterCreditStop(stopped: boolean): boolean {
  return stopped;
}
