import { createHash, createHmac } from 'node:crypto';

import { constantTimeEqual } from '../../../common/utilities/constant-time-equal.utility';
import {
  BITS_PER_BYTE,
  POW_TOKEN_SEPARATOR,
  POW_TOKEN_VERSION,
} from '../constants/anti-abuse.constants';
import { BotCheckReason } from '../enums/bot-check-reason.enum';
import { powChallengePayloadSchema } from '../schemas/pow-challenge-payload.schema';
import type { PowChallengePayload, PowTokenReading } from '../types/bot-check.types';

/** Leading zero BITS of a digest: 8 per zero byte, then the zeros of the first non-zero byte. */
export function countLeadingZeroBits(digest: Uint8Array): number {
  let bits = 0;
  for (const byte of digest) {
    if (byte !== 0) {
      return bits + Math.clz32(byte) - (32 - BITS_PER_BYTE);
    }
    bits += BITS_PER_BYTE;
  }
  return bits;
}

/**
 * The puzzle: SHA-256 over the UTF-8 text `salt + nonce` (salt is lowercase hex,
 * nonce a decimal string) must start with `difficulty` zero bits. The browser
 * solver hashes exactly the same text.
 */
export function meetsDifficulty(salt: string, nonce: string, difficulty: number): boolean {
  const digest = createHash('sha256').update(`${salt}${nonce}`, 'utf8').digest();
  return countLeadingZeroBits(digest) >= difficulty;
}

function sign(encodedPayload: string, key: string): string {
  return createHmac('sha256', key).update(encodedPayload).digest('base64url');
}

/** `base64url(json).base64url(hmac)`: stateless, so issuing a challenge costs no storage. */
export function signPowPayload(payload: PowChallengePayload, key: string): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}${POW_TOKEN_SEPARATOR}${sign(encoded, key)}`;
}

function decodePayload(encoded: string): unknown {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    // Unreadable after a VALID signature means a foreign shape; the caller refuses it.
    return null;
  }
}

/** Checks the signature first (constant time), then the payload's shape and version. */
export function readPowToken(token: string, key: string): PowTokenReading {
  const parts = token.split(POW_TOKEN_SEPARATOR);
  const [encoded, signature] = parts;
  if (parts.length !== 2 || !encoded || !signature) {
    return { failure: BotCheckReason.POW_MALFORMED };
  }
  if (!constantTimeEqual(signature, sign(encoded, key))) {
    return { failure: BotCheckReason.POW_BAD_SIGNATURE };
  }
  const parsed = powChallengePayloadSchema.safeParse(decodePayload(encoded));
  return parsed.success && parsed.data.v === POW_TOKEN_VERSION
    ? { payload: parsed.data }
    : { failure: BotCheckReason.POW_MALFORMED };
}
