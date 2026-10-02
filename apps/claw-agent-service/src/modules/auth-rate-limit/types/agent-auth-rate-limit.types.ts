import type { AgentAuthRateLimitScope } from '../enums/agent-auth-rate-limit-scope.enum';

/** One window on one route: at most `limit` hits per `windowSeconds`. */
export type AgentAuthRateLimitRule = {
  scope: AgentAuthRateLimitScope;
  limit: number;
  windowSeconds: number;
};

/** Who is asking. `pairingCode` is null on every route but pair/poll. */
export type AgentAuthRateLimitSubject = {
  ip: string;
  pairingCode: string | null;
};

/** The limiter's answer. A refusal always says how long to wait. */
export type AgentAuthRateLimitDecision =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };
