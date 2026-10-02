import type { AuthRateLimitScope } from '../enums/auth-rate-limit-scope.enum';
import type { AuthRateLimitSuccessAction } from '../enums/auth-rate-limit-success-action.enum';

/**
 * One window on one route: at most `limit` hits per `windowSeconds`.
 * `onSuccess` gives budget back after the handler succeeds; absent means a
 * success counts like any other attempt.
 */
export type AuthRateLimitRule = {
  scope: AuthRateLimitScope;
  limit: number;
  windowSeconds: number;
  onSuccess?: AuthRateLimitSuccessAction;
};

/**
 * Who is asking. `email` is already normalized (trim + lowercase) and is
 * `null` when the route takes no address or the body carried none.
 */
export type AuthRateLimitSubject = {
  ip: string;
  email: string | null;
};

/** The slice of an HTTP request the limiter reads (an Express Request fits). */
export type AuthRateLimitRequestView = {
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string };
  body?: unknown;
};

/** The limiter's answer. A refusal always says how long to wait. */
export type AuthRateLimitDecision =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };
