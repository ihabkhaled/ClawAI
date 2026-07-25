import { BillingErrorCode } from '@claw/shared-types';

import { BillingException } from '../../../../common/errors';

// PayPal renders money as a decimal STRING ("5.00"). Converting through a float
// is how amount verification quietly stops working: 0.1 + 0.2 !== 0.3, and a
// comparison that is off by one unit in the last place silently accepts an
// amount that is not the amount we charged.
//
// Parsing is therefore purely textual — split on the decimal point and treat
// both halves as integers.
export function paypalAmountToMinor(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    throw new BillingException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
  }
  const whole = Number.parseInt(match[1] ?? '0', 10);
  // "5.5" means 50 cents, not 5 — pad the fractional part to exactly 2 digits.
  const fractionText = (match[2] ?? '').padEnd(2, '0');
  const fraction = Number.parseInt(fractionText, 10);
  const minor = whole * 100 + fraction;
  if (!Number.isSafeInteger(minor)) {
    throw new BillingException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
  }
  return minor;
}

// Renders integer minor units back to the decimal string PayPal expects.
export function minorToPaypalAmount(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new BillingException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
  }
  const whole = Math.floor(amountMinor / 100);
  const fraction = amountMinor % 100;
  return `${whole}.${String(fraction).padStart(2, '0')}`;
}
