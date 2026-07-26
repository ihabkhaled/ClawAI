import { paypalAmountToMinor } from '../../gateways/paypal/utilities/paypal-amount.utility';
import { asBoundedString, asRecord } from './webhook-payload.utility';
import { type ReversalSubject } from '../types/reversal.types';

/**
 * Extracts what a PayPal refund/reversal payload tells us.
 *
 * Everything is optional by design — the payload is untrusted input and the
 * shapes differ between a refund and a network reversal. A missing field yields
 * null and the caller falls back to its own records, which is safer than parsing
 * defensively into a wrong number.
 *
 * The reversed capture is found under `links[rel=up]`: PayPal identifies the
 * original capture by URL rather than by a plain id field, so the last path
 * segment is the capture id.
 */
export function readReversalSubject(payload: Record<string, unknown>): ReversalSubject {
  const resource = asRecord(payload['resource']);
  if (resource === null) {
    return { captureId: null, reversalId: null, amountMinor: null, currency: null };
  }

  const amount = asRecord(resource['amount']);
  return {
    captureId: readReversedCaptureId(resource),
    reversalId: asBoundedString(resource['id'], 64),
    amountMinor: parseMinorUnits(asBoundedString(amount?.['value'], 32)),
    currency: asBoundedString(amount?.['currency_code'], 8),
  };
}

/** The capture id from `links[rel=up]`, or null when the link is absent. */
function readReversedCaptureId(resource: Record<string, unknown>): string | null {
  const links = resource['links'];
  if (!Array.isArray(links)) {
    return null;
  }
  for (const entry of links) {
    const link = asRecord(entry);
    if (link === null || asBoundedString(link['rel'], 16) !== 'up') {
      continue;
    }
    const href = asBoundedString(link['href'], 512);
    const segment = href?.split('/').at(-1) ?? null;
    // Bounded and non-empty. An id we cannot use is better than a stray "" that
    // silently matches nothing in a database lookup.
    return segment !== null && segment.length > 0 && segment.length <= 64 ? segment : null;
  }
  return null;
}

/**
 * Parses a PayPal decimal amount into integer minor units, or null.
 *
 * Delegates the actual parsing to `paypalAmountToMinor`, which already does it
 * textually — converting through a float loses a cent on values like "10.07".
 * The only thing added here is turning its exception into `null`: on a checkout
 * path an unparseable amount must abort, but on a reversal path it means "the
 * webhook did not tell us the size", and the caller falls back to the original
 * charge instead of failing.
 */
export function parseMinorUnits(value: string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return paypalAmountToMinor(value);
  } catch {
    return null;
  }
}
