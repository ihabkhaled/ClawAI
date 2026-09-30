import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  CHANNEL_SECRET_LABEL,
  CHANNEL_SIGNATURE_MAX_SKEW_SECONDS,
  CHANNEL_SIGNATURE_PREFIX,
} from '../constants/channel.constants';

/**
 * The per-owner webhook secret, derived rather than stored.
 *
 * HMAC over a fixed label and the owner id means the database never holds a
 * secret that could leak, and one owner's secret says nothing about another's.
 * The trade-off is recorded: rotating it means rotating the master key.
 */
export function deriveChannelSecret(masterKey: string, userId: string): string {
  return createHmac('sha256', masterKey).update(`${CHANNEL_SECRET_LABEL}:${userId}`).digest('hex');
}

/** `sha256=<hex>` over `<timestamp>.<raw body>`, the format a sender must produce. */
export function signChannelPayload(secret: string, timestamp: string, rawBody: string): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `${CHANNEL_SIGNATURE_PREFIX}${digest}`;
}

/** True only when the timestamp is an integer within the allowed skew of now. */
export function isFreshChannelTimestamp(timestamp: string, nowMs: number): boolean {
  if (!/^\d{1,12}$/.test(timestamp)) return false;
  const skew = Math.abs(nowMs / 1_000 - Number(timestamp));
  return skew <= CHANNEL_SIGNATURE_MAX_SKEW_SECONDS;
}

/** Constant-time comparison; a length mismatch is a plain refusal. */
export function isValidChannelSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  received: string,
): boolean {
  const expected = Buffer.from(signChannelPayload(secret, timestamp, rawBody), 'utf8');
  const actual = Buffer.from(received, 'utf8');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
