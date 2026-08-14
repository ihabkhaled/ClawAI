import { RouterErrorCode, RouterFailureScope } from '../../../common/enums';

/** HTTP statuses an adapter maps directly, before any provider-specific hints. */
export const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
export const HTTP_STATUS_UNAUTHORIZED = 401;
export const HTTP_STATUS_FORBIDDEN = 403;
export const HTTP_STATUS_NOT_FOUND = 404;
export const HTTP_STATUS_GONE = 410;
export const HTTP_STATUS_UNPROCESSABLE = 422;
export const HTTP_STATUS_SERVER_ERROR_FLOOR = 500;

/**
 * Retrying these can succeed with no other change, so an entry may spend its
 * own retry budget on them.
 *
 * 401/403 are pointedly absent: a credential does not become valid because it
 * was asked twice, and hammering an auth failure is how a provider starts
 * rate-limiting everything else.
 */
export const RETRYABLE_ROUTER_ERRORS: ReadonlySet<RouterErrorCode> = new Set([
  RouterErrorCode.TIMEOUT,
  RouterErrorCode.RATE_LIMITED,
  RouterErrorCode.PROVIDER_5XX,
  RouterErrorCode.NETWORK,
]);

/**
 * How far each failure invalidates the chain. Anything unlisted is MODEL —
 * the conservative choice, since wrongly condemning a provider costs more
 * candidates than wrongly advancing one entry.
 */
export const ROUTER_ERROR_FAILURE_SCOPE: Readonly<Record<RouterErrorCode, RouterFailureScope>> =
  Object.freeze({
    // The provider is unreachable or unwell — later entries on it will fail too.
    [RouterErrorCode.TIMEOUT]: RouterFailureScope.PROVIDER,
    [RouterErrorCode.NETWORK]: RouterFailureScope.PROVIDER,
    [RouterErrorCode.PROVIDER_5XX]: RouterFailureScope.PROVIDER,
    // A quota or a credential is account-wide, not model-specific.
    [RouterErrorCode.RATE_LIMITED]: RouterFailureScope.PROVIDER,
    [RouterErrorCode.AUTHENTICATION_FAILED]: RouterFailureScope.PROVIDER,
    [RouterErrorCode.AUTHORIZATION_FAILED]: RouterFailureScope.PROVIDER,
    // This model specifically is wrong; a sibling on the same provider may work.
    [RouterErrorCode.MODEL_NOT_FOUND]: RouterFailureScope.MODEL,
    [RouterErrorCode.MODEL_RETIRED]: RouterFailureScope.MODEL,
    [RouterErrorCode.CAPABILITY_MISMATCH]: RouterFailureScope.MODEL,
    [RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT]: RouterFailureScope.MODEL,
    [RouterErrorCode.LOW_CONFIDENCE]: RouterFailureScope.MODEL,
    [RouterErrorCode.UNKNOWN]: RouterFailureScope.MODEL,
    // Not the chain's to route around.
    [RouterErrorCode.CANCELLED]: RouterFailureScope.REQUEST,
    [RouterErrorCode.BUDGET_EXCEEDED]: RouterFailureScope.REQUEST,
    [RouterErrorCode.POLICY_BLOCKED]: RouterFailureScope.REQUEST,
  });

/**
 * Failures that mean the deployment record itself is wrong, not merely unlucky.
 *
 * Quarantining stops the chain re-selecting a model the provider has withdrawn
 * on every subsequent request — the pack's "401/403/model-retired errors
 * quarantine or disable the deployment instead of looping".
 */
export const QUARANTINING_ROUTER_ERRORS: ReadonlySet<RouterErrorCode> = new Set([
  RouterErrorCode.MODEL_NOT_FOUND,
  RouterErrorCode.MODEL_RETIRED,
  RouterErrorCode.AUTHENTICATION_FAILED,
  RouterErrorCode.AUTHORIZATION_FAILED,
]);

/**
 * A malformed structured output earns exactly one stricter re-ask before the
 * chain moves on. Two would double the latency of the most common soft failure
 * for a model that has already shown it cannot hold the schema.
 */
export const MAX_STRUCTURED_OUTPUT_REPAIRS = 1;

/** Error names Node/undici use for an aborted request. */
export const ABORT_ERROR_NAMES: ReadonlySet<string> = new Set(['AbortError', 'TimeoutError']);

/**
 * Substrings that identify a transport failure in a thrown error message.
 * Matched case-insensitively, and only after abort has been ruled out.
 */
export const NETWORK_ERROR_HINTS: readonly string[] = [
  'fetch failed',
  'econnrefused',
  'econnreset',
  'enotfound',
  'eai_again',
  'socket hang up',
  'network',
  'dns',
];

/**
 * Provider message fragments that distinguish a withdrawn model from a merely
 * unknown one. A 404 alone cannot tell them apart, and the difference decides
 * whether an operator sees "check the id" or "this model is gone".
 */
export const MODEL_RETIRED_HINTS: readonly string[] = [
  'retired',
  'deprecated',
  'no longer available',
  'has been discontinued',
  'sunset',
];
