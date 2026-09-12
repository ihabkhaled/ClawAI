import { DisplayRoundingPolicy } from '@claw/shared-types';

import { displayMinorUnitExponent } from './display-currency.utility';
import { MoneyError } from './money-error';
import { MoneyErrorCode } from './money-error-code.enum';
import { roundHalfUpDivide } from './money.utility';

// Commercial rounding is PRESENTATION POLICY. It never touches a canonical
// price, a provider cost, a wallet balance, an invoice, a refund or a gateway
// amount — every one of those is settled by payment-service under its own
// exact rules, and a "nicer" number in any of them is a wrong number.
//
// The purpose is narrow: a converted price should read like a price. Raw output
// of a rate multiplication ("EGP 512.83") reads like a calculator, and a
// calculator is not what a plan card is for.
//
// This is NOT price optimization. There are no .99 endings and no upward bias:
// rounding is to the NEAREST allowed increment, so the localized figure stays
// an honest picture of the canonical price rather than a quietly inflated one.

// Increment ladder, expressed in MAJOR units and keyed by the magnitude of the
// amount rather than by currency. Magnitude is what makes a number look
// awkward: 512.83 is awkward in any currency and 8.47 is fine in any currency,
// so a ladder beats sixty per-currency tables that would immediately drift.
const COMMERCIAL_INCREMENT_LADDER: ReadonlyArray<{ below: number; incrementMajor: number }> =
  Object.freeze([
    // Under ten, two decimals already read naturally. Rounding here would lose
    // real precision on a cheap plan for no cosmetic gain.
    { below: 10, incrementMajor: 0.01 },
    { below: 100, incrementMajor: 1 },
    { below: 1_000, incrementMajor: 5 },
    { below: 10_000, incrementMajor: 10 },
    { below: 100_000, incrementMajor: 50 },
    { below: 1_000_000, incrementMajor: 100 },
    { below: Number.POSITIVE_INFINITY, incrementMajor: 1_000 },
  ]);

// The increment in MINOR units for an amount of this magnitude in this currency.
// Never smaller than one minor unit: a zero-decimal currency has no sub-unit to
// round to, and JPY 0.01 does not exist.
export function commercialIncrementMinor(absoluteAmountMinor: number, currency: string): number {
  const exponent = displayMinorUnitExponent(currency);
  const minorPerMajor = 10 ** exponent;
  const absoluteMajor = absoluteAmountMinor / minorPerMajor;
  const rung =
    COMMERCIAL_INCREMENT_LADDER.find((step) => absoluteMajor < step.below) ??
    COMMERCIAL_INCREMENT_LADDER.at(-1);
  if (rung === undefined) {
    return 1;
  }
  return Math.max(1, Math.round(rung.incrementMajor * minorPerMajor));
}

// Rounds a converted amount to the nearest commercially meaningful increment.
//
// Zero stays zero: a free plan is free, and "≈ EGP 5" on a $0 tier would be a
// lie produced by arithmetic. A non-zero amount never collapses to zero either
// — a real charge that displays as nothing has told the user they paid nothing.
export function applyCommercialRounding(amountMinor: number, currency: string): number {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new MoneyError(
      MoneyErrorCode.NON_INTEGER_AMOUNT,
      'amountMinor must be a safe integer minor-unit amount',
    );
  }
  if (amountMinor === 0) {
    return 0;
  }

  // Sign is stripped, the magnitude is rounded, and the sign is restored, so a
  // refund of -515 rounds by the same magnitude as the charge it reverses.
  // Rounding the signed value directly would round a credit and its debit in
  // opposite directions and leave a cent visible on screen that does not exist.
  const negative = amountMinor < 0;
  const absolute = Math.abs(amountMinor);
  const increment = commercialIncrementMinor(absolute, currency);
  const rounded = roundHalfUpDivide(absolute, increment) * increment;
  const floored = rounded === 0 ? increment : rounded;
  return negative ? -floored : floored;
}

// Applies the policy for a surface.
//
// PRECISE_USAGE returns the converted amount untouched. A usage ledger is an
// account of what someone actually consumed, and prettifying it is the one
// place where a rounder number is a worse number.
export function applyDisplayRoundingPolicy(
  amountMinor: number,
  currency: string,
  policy: DisplayRoundingPolicy,
): number {
  return policy === DisplayRoundingPolicy.COMMERCIAL_PRICE
    ? applyCommercialRounding(amountMinor, currency)
    : amountMinor;
}

// True when a non-zero amount is too small to show in this currency's smallest
// unit. The renderer prints "< 0.01" rather than "0.00", because a user who
// spent something must not be told they spent nothing.
export function isBelowSmallestDisplayUnit(
  canonicalAmountMinor: number,
  displayAmountMinor: number,
): boolean {
  return canonicalAmountMinor !== 0 && displayAmountMinor === 0;
}
