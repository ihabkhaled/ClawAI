import { createHash } from 'node:crypto';
import { resolveClientAddress } from '@claw/shared-auth';

import {
  AGENT_AUTH_RATE_LIMIT_KEY_PREFIX,
  UNKNOWN_CLIENT_IP,
} from '../constants/agent-auth-rate-limit.constants';
import type { AgentAuthRateLimitPolicy } from '../enums/agent-auth-rate-limit-policy.enum';
import { AgentAuthRateLimitScope } from '../enums/agent-auth-rate-limit-scope.enum';
import type { AgentAuthRateLimitSubject } from '../types/agent-auth-rate-limit.types';

/**
 * The client address to count a request against. The rule lives once, in
 * `resolveClientAddress` of @claw/shared-auth: X-Real-IP only when the peer
 * IS nginx (or a configured trusted proxy), otherwise the peer (rules/58 item 3).
 */
export async function resolveClientIp(
  headers: Record<string, string | string[] | undefined>,
  socketAddress: string | undefined,
): Promise<string> {
  const client = await resolveClientAddress(headers, socketAddress);
  return client?.address ?? UNKNOWN_CLIENT_IP;
}

/** The `pairingCode` query parameter, or null. */
export function readPairingCode(query: unknown): string | null {
  const value: unknown =
    query !== null && typeof query === 'object' && 'pairingCode' in query
      ? query.pairingCode
      : null;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** SHA-256, truncated: no IP or pairing code ever appears in a Redis key. */
export function hashRateLimitPart(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

/** The Redis key for one window, or null when its subject is missing. */
export function buildAgentAuthRateLimitKey(
  policy: AgentAuthRateLimitPolicy,
  scope: AgentAuthRateLimitScope,
  subject: AgentAuthRateLimitSubject,
): string | null {
  const prefix = `${AGENT_AUTH_RATE_LIMIT_KEY_PREFIX}${policy}:${scope}:`;
  switch (scope) {
    case AgentAuthRateLimitScope.IP:
      return `${prefix}${hashRateLimitPart(subject.ip)}`;
    case AgentAuthRateLimitScope.PAIRING_CODE:
      return subject.pairingCode === null
        ? null
        : `${prefix}${hashRateLimitPart(subject.pairingCode)}`;
  }
}
