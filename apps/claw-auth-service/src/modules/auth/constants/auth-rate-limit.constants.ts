import { AuthRateLimitPolicy } from '../enums/auth-rate-limit-policy.enum';
import { AuthRateLimitScope } from '../enums/auth-rate-limit-scope.enum';
import { AuthRateLimitSuccessAction } from '../enums/auth-rate-limit-success-action.enum';
import type { AuthRateLimitRule } from '../types/auth-rate-limit.types';

/** Redis key prefix. Every part after it is a policy, a scope and a SHA-256 digest. */
export const AUTH_RATE_LIMIT_KEY_PREFIX = 'auth:rl:';

/** Reflector metadata key set by `@AuthRateLimit(policy)`. */
export const AUTH_RATE_LIMIT_METADATA_KEY = 'claw:auth-rate-limit-policy';

/**
 * How long one Redis hit may take before the limiter gives up and lets the
 * request through. The client is built with `maxRetriesPerRequest: null`, so
 * during an outage a command would otherwise wait forever and take sign-in
 * down with it.
 */
export const AUTH_RATE_LIMIT_REDIS_TIMEOUT_MS = 250;

/** The code the frontend already maps for a 429 (ApiErrorCode.RATE_LIMITED). */
export const AUTH_RATE_LIMIT_ERROR_CODE = 'RATE_LIMITED';

/** For a log reader only; the frontend renders its own translated copy (rule 43 §2). */
export const AUTH_RATE_LIMIT_ERROR_MESSAGE = 'Too many attempts. Please try again later.';

export const RETRY_AFTER_HEADER = 'Retry-After';

/** Bucket for a request with no usable address at all. */
export const UNKNOWN_CLIENT_IP = 'unknown';

const MINUTE = 60;
const FIFTEEN_MINUTES = 15 * MINUTE;
const HOUR = 60 * MINUTE;

/**
 * The approved budgets (owner decision 2026-10-02, rules/58).
 *
 * - Login: 10 / 15 min per IP+address stops guessing one account; 30 / 15 min
 *   per IP stops spraying many. 30 is high enough that a person who locked a
 *   throwaway address can still sign in to their real one from the same IP.
 *   A SUCCESSFUL sign-in resets its IP+address window and refunds its own
 *   per-IP hit, so only failures use the budget: an SDK that signs in on
 *   every run, or an office behind one NAT, is never refused for signing in
 *   correctly (rules/58 item 10).
 * - Register: the one route that reveals a taken address (ADR-096), so the
 *   tightest: 5 / hour per IP, 3 / hour per address.
 * - Token confirms (reset, verification, email change): 10 / 15 min per IP
 *   bounds token guessing; the tokens are long, so this is belt and braces.
 * - Reset request and verification resend keep their per-address cooldown in
 *   EmailDispatchCooldownService; this adds 5 / hour per IP on top.
 * - Refresh: 60 / min per IP. Every open tab refreshes, so this is loose.
 *   Not keyed per token family: that needs a database read before the limit.
 * - VS Code: init 10 / min, exchange 20 / min per IP.
 */
export const AUTH_RATE_LIMIT_POLICIES: ReadonlyMap<
  AuthRateLimitPolicy,
  readonly AuthRateLimitRule[]
> = new Map<AuthRateLimitPolicy, readonly AuthRateLimitRule[]>([
  [
    AuthRateLimitPolicy.LOGIN,
    [
      {
        scope: AuthRateLimitScope.IP_EMAIL,
        limit: 10,
        windowSeconds: FIFTEEN_MINUTES,
        onSuccess: AuthRateLimitSuccessAction.RESET,
      },
      {
        scope: AuthRateLimitScope.IP,
        limit: 30,
        windowSeconds: FIFTEEN_MINUTES,
        onSuccess: AuthRateLimitSuccessAction.REFUND,
      },
    ],
  ],
  [
    AuthRateLimitPolicy.REGISTER,
    [
      { scope: AuthRateLimitScope.IP, limit: 5, windowSeconds: HOUR },
      { scope: AuthRateLimitScope.EMAIL, limit: 3, windowSeconds: HOUR },
    ],
  ],
  [
    AuthRateLimitPolicy.REFRESH,
    [{ scope: AuthRateLimitScope.IP, limit: 60, windowSeconds: MINUTE }],
  ],
  [
    AuthRateLimitPolicy.PASSWORD_RESET_REQUEST,
    [{ scope: AuthRateLimitScope.IP, limit: 5, windowSeconds: HOUR }],
  ],
  [
    AuthRateLimitPolicy.PASSWORD_RESET_CONFIRM,
    [{ scope: AuthRateLimitScope.IP, limit: 10, windowSeconds: FIFTEEN_MINUTES }],
  ],
  [
    AuthRateLimitPolicy.EMAIL_VERIFICATION_RESEND,
    [{ scope: AuthRateLimitScope.IP, limit: 5, windowSeconds: HOUR }],
  ],
  [
    AuthRateLimitPolicy.EMAIL_VERIFICATION_CONFIRM,
    [{ scope: AuthRateLimitScope.IP, limit: 10, windowSeconds: FIFTEEN_MINUTES }],
  ],
  [
    AuthRateLimitPolicy.EMAIL_CHANGE_CONFIRM,
    [{ scope: AuthRateLimitScope.IP, limit: 10, windowSeconds: FIFTEEN_MINUTES }],
  ],
  [
    AuthRateLimitPolicy.VSCODE_AUTHORIZE_INIT,
    [{ scope: AuthRateLimitScope.IP, limit: 10, windowSeconds: MINUTE }],
  ],
  [
    AuthRateLimitPolicy.VSCODE_AUTHORIZE_EXCHANGE,
    [{ scope: AuthRateLimitScope.IP, limit: 20, windowSeconds: MINUTE }],
  ],
]);
