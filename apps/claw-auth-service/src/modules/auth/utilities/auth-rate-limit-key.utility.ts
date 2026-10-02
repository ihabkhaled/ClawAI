import { createHash } from 'node:crypto';
import { resolveClientAddress } from '@claw/shared-auth';

import {
  AUTH_RATE_LIMIT_KEY_PREFIX,
  UNKNOWN_CLIENT_IP,
} from '../constants/auth-rate-limit.constants';
import type { AuthRateLimitPolicy } from '../enums/auth-rate-limit-policy.enum';
import { AuthRateLimitScope } from '../enums/auth-rate-limit-scope.enum';
import type {
  AuthRateLimitRequestView,
  AuthRateLimitSubject,
} from '../types/auth-rate-limit.types';

/**
 * The client address to count a request against: the X-Real-IP nginx wrote
 * when the socket peer IS nginx (or a configured trusted proxy), otherwise the
 * peer itself. The rule lives once, in `resolveClientAddress` of
 * @claw/shared-auth, shared with the global throttler (rules/58 item 3).
 */
export async function resolveClientIp(
  headers: Record<string, string | string[] | undefined>,
  socketAddress: string | undefined,
): Promise<string> {
  const client = await resolveClientAddress(headers, socketAddress);
  return client?.address ?? UNKNOWN_CLIENT_IP;
}

/**
 * Who one request is counted against. The guard (before the handler) and the
 * success interceptor (after it) both call this, so they always agree on the
 * keys they touch.
 */
export async function readAuthRateLimitSubject(
  request: AuthRateLimitRequestView,
): Promise<AuthRateLimitSubject> {
  return {
    ip: await resolveClientIp(request.headers, request.socket.remoteAddress),
    email: readRateLimitEmail(request.body),
  };
}

/**
 * Trim and lowercase, nothing more. `+tags` and dots are kept: they can be
 * different accounts here, and folding them would let one person's typos
 * spend another person's budget.
 */
export function normalizeRateLimitEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length === 0 ? null : normalized;
}

/** The `email` field of an unvalidated request body, normalized, or null. */
export function readRateLimitEmail(body: unknown): string | null {
  return body !== null && typeof body === 'object' && 'email' in body
    ? normalizeRateLimitEmail(body.email)
    : null;
}

/**
 * SHA-256, truncated. A Redis keyspace dump must not be a readable list of
 * who is signing in, and neither an address nor an IP ever appears in a key
 * (rule 43 §1).
 */
export function hashRateLimitPart(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

/**
 * The Redis key for one window, or null when the window needs an address and
 * the request carried none (a bad body is still counted per IP).
 */
export function buildAuthRateLimitKey(
  policy: AuthRateLimitPolicy,
  scope: AuthRateLimitScope,
  subject: AuthRateLimitSubject,
): string | null {
  const prefix = `${AUTH_RATE_LIMIT_KEY_PREFIX}${policy}:${scope}:`;
  switch (scope) {
    case AuthRateLimitScope.IP:
      return `${prefix}${hashRateLimitPart(subject.ip)}`;
    case AuthRateLimitScope.EMAIL:
      return subject.email === null ? null : `${prefix}${hashRateLimitPart(subject.email)}`;
    case AuthRateLimitScope.IP_EMAIL:
      return subject.email === null
        ? null
        : `${prefix}${hashRateLimitPart(`${subject.ip}|${subject.email}`)}`;
  }
}
