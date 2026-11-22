import {
  CREDIT_FIXED_PRICE_MIXED,
  CREDIT_FIXED_PRICE_NOT_ALLOWED,
  CREDIT_FIXED_PRICE_REQUIRED,
  FIXED_PRICE_SURFACES,
} from '../constants/credit.constants';
import {
  type CreditFinalizeInput,
  type CreditFixedPriceViolation,
  type CreditReserveInput,
} from '../types/credit.types';

/** True for a surface whose price the caller states (see FIXED_PRICE_SURFACES). */
export function isFixedPriceSurface(surface: string | null | undefined): boolean {
  const fixedSurfaces: readonly string[] = FIXED_PRICE_SURFACES;
  return surface !== null && surface !== undefined && fixedSurfaces.includes(surface);
}

function anyPositive(values: readonly (number | undefined)[]): boolean {
  return values.some((value) => (value ?? 0) > 0);
}

/**
 * Why this reserve breaks the fixed-price contract, or `null` when it keeps it.
 *
 * A fixed price on a rate-priced surface would let a caller name its own price
 * for a model call; a rate-priced shape on a fixed-price surface would send the
 * call to a rate lookup that can only refuse; and a fixed price PLUS counts
 * would be one call priced two ways. A Threads budget is a count-shaped bound
 * too, so it is refused alongside the counts.
 */
export function reserveFixedPriceViolation(
  input: CreditReserveInput,
): CreditFixedPriceViolation | null {
  const fixedSurface = isFixedPriceSurface(input.surface);
  if (!fixedSurface) {
    return input.fixedCostMicroUsd === undefined ? null : CREDIT_FIXED_PRICE_NOT_ALLOWED;
  }
  if (input.fixedCostMicroUsd === undefined) {
    return CREDIT_FIXED_PRICE_REQUIRED;
  }
  const mixed =
    anyPositive([
      input.promptTokens,
      input.cachedPromptTokens,
      input.cacheWritePromptTokens,
      input.imageUnits,
      input.audioSeconds,
      input.ttsCharacters,
      input.videoSeconds,
    ]) || input.threadJobBudgetId !== undefined;
  return mixed ? CREDIT_FIXED_PRICE_MIXED : null;
}

/**
 * The same contract at finalize, judged against the surface the RESERVATION
 * was taken under (its ledger row), never against anything the finalize body
 * claims: a caller cannot turn a rate-priced hold into a fixed-price one.
 */
export function finalizeFixedPriceViolation(
  input: CreditFinalizeInput,
  reservationSurface: string | null,
): CreditFixedPriceViolation | null {
  if (!isFixedPriceSurface(reservationSurface)) {
    return input.fixedCostMicroUsd === undefined ? null : CREDIT_FIXED_PRICE_NOT_ALLOWED;
  }
  if (input.fixedCostMicroUsd === undefined) {
    return CREDIT_FIXED_PRICE_REQUIRED;
  }
  return anyPositive([
    input.promptTokens,
    input.completionTokens,
    input.cachedPromptTokens,
    input.cacheCreationPromptTokens,
    input.reasoningTokens,
    input.toolCalls,
    input.searchCalls,
    input.imageUnits,
    input.audioSeconds,
    input.ttsCharacters,
    input.videoSeconds,
  ])
    ? CREDIT_FIXED_PRICE_MIXED
    : null;
}

/** What a fixed-price finalize charges: the stated price, never more than the hold. */
export function fixedSettlementMicroUsd(fixedCostMicroUsd: number, heldMicroUsd: bigint): bigint {
  const stated = BigInt(fixedCostMicroUsd);
  return stated < heldMicroUsd ? stated : heldMicroUsd;
}
