import { createHmac, timingSafeEqual } from 'node:crypto';

import { LIVE_CLOSE_TOKEN_CONTEXT } from '../constants/live-session.constants';
import type { LiveCloseTokenClaims } from '../types/live-session.types';

function mac(secret: string, payload: string): Buffer {
  return createHmac('sha256', secret).update(`${LIVE_CLOSE_TOKEN_CONTEXT}.${payload}`).digest();
}

/** `<base64url(claims)>.<base64url(hmac)>`, keyed with JWT_SECRET and domain-separated. */
export function signCloseToken(secret: string, claims: LiveCloseTokenClaims): string {
  const payload = Buffer.from(
    JSON.stringify({ s: claims.sessionId, u: claims.userId, e: claims.expiresAt }),
  ).toString('base64url');
  return `${payload}.${mac(secret, payload).toString('base64url')}`;
}

/** The claims of a valid, unexpired token; null for anything else. Constant-time MAC check. */
export function verifyCloseToken(
  secret: string,
  token: string,
  now: number,
): LiveCloseTokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const expected = mac(secret, parts[0]);
  const given = Buffer.from(parts[1], 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const { s, u, e } = raw as { s?: unknown; u?: unknown; e?: unknown };
  if (typeof s !== 'string' || typeof u !== 'string' || typeof e !== 'number') return null;
  return e > now ? { sessionId: s, userId: u, expiresAt: e } : null;
}
