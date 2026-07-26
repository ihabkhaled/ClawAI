import { CARD_LAST4_LENGTH } from '../constants/webhook.constants';
import { asBoundedString } from './webhook-payload.utility';
import { type CardExpiry } from '../types/paymob-card.types';

/**
 * The last four digits of a masked PAN.
 *
 * Paymob renders the mask in several shapes (`xxxx-xxxx-xxxx-4242`,
 * `************4242`, sometimes just `4242`), so the digits are extracted rather
 * than sliced at a fixed offset. Returns null when fewer than four digits are
 * present — a partial fragment on an invoice is worse than none, because it looks
 * like data and is not.
 *
 * This is the ONLY card fragment permitted anywhere in storage. Nothing here can
 * return more: the result is truncated to four characters by construction.
 */
export function readCardLast4(maskedPan: string | null | undefined): string | null {
  if (maskedPan === null || maskedPan === undefined) {
    return null;
  }
  const digits = maskedPan.replaceAll(/\D/gu, '');
  return digits.length >= CARD_LAST4_LENGTH ? digits.slice(-CARD_LAST4_LENGTH) : null;
}

/**
 * Card expiry from a card-token callback, when present.
 *
 * Both fields are optional in Paymob's payload and are stored only to render
 * "expires 04/28" and to warn before a saved card lapses. A missing or nonsensical
 * value yields null rather than a guess — an expiry we invented would produce a
 * warning at the wrong time.
 *
 * Two-digit years are expanded into the 2000s: a card expiring in `28` means 2028,
 * and no card in circulation expires in 1928.
 */
export function readCardExpiry(payload: Record<string, unknown>): CardExpiry {
  return {
    month: readMonth(payload),
    year: readYear(payload),
  };
}

function readMonth(payload: Record<string, unknown>): number | null {
  const raw = asBoundedString(payload['exp_month'] ?? payload['expiry_month'], 4);
  const month = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

function readYear(payload: Record<string, unknown>): number | null {
  const raw = asBoundedString(payload['exp_year'] ?? payload['expiry_year'], 4);
  const parsed = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  const year = parsed < 100 ? 2000 + parsed : parsed;
  // A plausible card year. Anything outside this is a parse error wearing a
  // number, and storing it would misreport when the card lapses.
  return year >= 2000 && year <= 2100 ? year : null;
}
