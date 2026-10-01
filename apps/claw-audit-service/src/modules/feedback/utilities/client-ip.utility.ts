import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

import {
  FEEDBACK_REAL_IP_HEADER,
  FEEDBACK_UNKNOWN_CLIENT,
} from '../constants/feedback-public.constants';

// nginx overwrites X-Real-IP with the socket address on every request, so it is
// the only client-address header worth reading. X-Forwarded-For APPENDS, which
// leaves its head attacker-controlled — never use it as a rate-limit key.
export function resolveClientIp(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers[FEEDBACK_REAL_IP_HEADER];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value !== undefined && isIP(value) !== 0 ? value : FEEDBACK_UNKNOWN_CLIENT;
}

// Keys are hashed so a Redis dump is not a list of who wrote in.
export function hashRateKeyPart(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 32);
}
