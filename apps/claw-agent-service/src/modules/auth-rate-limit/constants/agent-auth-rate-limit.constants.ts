import {
  PAIR_INIT_RATE_LIMIT_PER_MINUTE,
  PAIR_POLL_MIN_INTERVAL_MS,
} from '../../../common/constants/auth.constants';
import { AgentAuthRateLimitPolicy } from '../enums/agent-auth-rate-limit-policy.enum';
import { AgentAuthRateLimitScope } from '../enums/agent-auth-rate-limit-scope.enum';
import type { AgentAuthRateLimitRule } from '../types/agent-auth-rate-limit.types';

/** Redis key prefix. Every part after it is a policy, a scope and a SHA-256 digest. */
export const AGENT_AUTH_RATE_LIMIT_KEY_PREFIX = 'agent:auth:rl:';

/** Reflector metadata key set by `@AgentAuthRateLimit(policy)`. */
export const AGENT_AUTH_RATE_LIMIT_METADATA_KEY = 'claw:agent-auth-rate-limit-policy';

/**
 * How long one Redis hit may take before the limiter lets the request through.
 * The client is built with `maxRetriesPerRequest: null`, so during an outage a
 * command would otherwise wait forever and take device sign-in down with it.
 */
export const AGENT_AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS = 250;

/** Same code auth-service and the frontend use for a 429. */
export const AGENT_AUTH_RATE_LIMIT_ERROR_CODE = 'RATE_LIMITED';

/** Message key, as every agent-service BusinessException carries. */
export const AGENT_AUTH_RATE_LIMIT_MESSAGE_KEY = 'agent.auth.rate_limited';

export const RETRY_AFTER_HEADER = 'Retry-After';

/** Bucket for a request with no usable address at all. */
export const UNKNOWN_CLIENT_IP = 'unknown';

const MINUTE = 60;

/**
 * The approved budgets (owner decision 2026-10-02, rules/58).
 *
 * - pair/init: the existing PAIR_INIT_RATE_LIMIT_PER_MINUTE (10 / min per IP),
 *   defined long ago and never applied until now.
 * - pair/poll: one poll per PAIR_POLL_MIN_INTERVAL_MS per pairing code. The
 *   extension polls every `intervalSeconds` (2 s), so it never trips this;
 *   only a client hammering the route gets 429 + Retry-After.
 * - device-code/create: 10 / min per IP. device-code/token keeps its own
 *   RFC 8628 `slow_down` handling in DeviceCodeService and is not listed here.
 * - refresh: 60 / min per IP. SSO callback: 30 / min per IP.
 */
export const AGENT_AUTH_RATE_LIMIT_POLICIES: ReadonlyMap<
  AgentAuthRateLimitPolicy,
  readonly AgentAuthRateLimitRule[]
> = new Map<AgentAuthRateLimitPolicy, readonly AgentAuthRateLimitRule[]>([
  [
    AgentAuthRateLimitPolicy.PAIR_INIT,
    [
      {
        scope: AgentAuthRateLimitScope.IP,
        limit: PAIR_INIT_RATE_LIMIT_PER_MINUTE,
        windowSeconds: MINUTE,
      },
    ],
  ],
  [
    AgentAuthRateLimitPolicy.PAIR_POLL,
    [
      {
        scope: AgentAuthRateLimitScope.PAIRING_CODE,
        limit: 1,
        windowSeconds: Math.max(1, Math.ceil(PAIR_POLL_MIN_INTERVAL_MS / 1_000)),
      },
    ],
  ],
  [
    AgentAuthRateLimitPolicy.DEVICE_CODE_CREATE,
    [{ scope: AgentAuthRateLimitScope.IP, limit: 10, windowSeconds: MINUTE }],
  ],
  [
    AgentAuthRateLimitPolicy.REFRESH,
    [{ scope: AgentAuthRateLimitScope.IP, limit: 60, windowSeconds: MINUTE }],
  ],
  [
    AgentAuthRateLimitPolicy.SSO_CALLBACK,
    [{ scope: AgentAuthRateLimitScope.IP, limit: 30, windowSeconds: MINUTE }],
  ],
]);
