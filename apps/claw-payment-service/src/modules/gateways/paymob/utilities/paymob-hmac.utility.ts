import { createHmac, timingSafeEqual } from 'node:crypto';

import { PAYMOB_HMAC_ALGORITHM, PAYMOB_HMAC_FIELD_ORDER } from '../constants/paymob.constants';

// Reads a dotted path ("order.id", "source_data.pan") out of the callback
// payload. A missing field becomes the empty string, which is what Paymob does
// when building the digest on its side.
function readPath(payload: Record<string, unknown>, path: string): string {
  const value = path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node !== null && typeof node === 'object'
          ? (node as Record<string, unknown>)[key]
          : undefined,
      payload,
    );
  if (value === null || value === undefined) {
    return '';
  }
  // Booleans must render exactly as Paymob renders them ("true"/"false"), and
  // numbers without formatting — anything else changes the digest.
  return String(value);
}

// Concatenates the HMAC source string in Paymob's fixed field order.
export function buildPaymobHmacPayload(payload: Record<string, unknown>): string {
  return PAYMOB_HMAC_FIELD_ORDER.map((path) => readPath(payload, path)).join('');
}

export function computePaymobHmac(payload: Record<string, unknown>, secret: string): string {
  return createHmac(PAYMOB_HMAC_ALGORITHM, secret)
    .update(buildPaymobHmacPayload(payload))
    .digest('hex');
}

// Constant-time comparison. A plain === leaks how many leading characters
// matched through timing, which is enough to forge a digest byte by byte given
// enough attempts.
//
// timingSafeEqual throws on a length mismatch, so the lengths are compared
// first — that check is not secret-dependent (the digest length is fixed and
// public), so short-circuiting on it leaks nothing.
export function verifyPaymobHmac(
  payload: Record<string, unknown>,
  receivedHmac: string,
  secret: string,
): boolean {
  const expected = computePaymobHmac(payload, secret);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(receivedHmac.trim().toLowerCase(), 'utf8');
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
