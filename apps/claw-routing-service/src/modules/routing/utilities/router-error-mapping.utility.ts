import { RouterErrorCode, RouterFailureScope } from '../../../common/enums';
import { recordGet } from '../../../common/utilities';
import {
  ABORT_ERROR_NAMES,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_GONE,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_SERVER_ERROR_FLOOR,
  HTTP_STATUS_TOO_MANY_REQUESTS,
  HTTP_STATUS_UNAUTHORIZED,
  HTTP_STATUS_UNPROCESSABLE,
  JSON_PARSE_ERROR_NAME,
  MODEL_RETIRED_HINTS,
  NETWORK_ERROR_HINTS,
  QUARANTINING_ROUTER_ERRORS,
  RETRYABLE_ROUTER_ERRORS,
  ROUTER_ERROR_FAILURE_SCOPE,
} from '../constants/router-error.constants';

function includesAnyHint(haystack: string, hints: readonly string[]): boolean {
  const lowered = haystack.toLowerCase();
  return hints.some((hint) => lowered.includes(hint));
}

/**
 * Translates an HTTP status into the canonical vocabulary.
 *
 * `body` is the provider's message, used only to separate a withdrawn model
 * from an unknown one — a 404 alone cannot distinguish "you typed it wrong"
 * from "we removed it", and the two lead an operator to different actions.
 */
export function mapHttpStatusToRouterError(status: number, body?: string): RouterErrorCode {
  if (status === HTTP_STATUS_TOO_MANY_REQUESTS) {
    return RouterErrorCode.RATE_LIMITED;
  }
  if (status === HTTP_STATUS_UNAUTHORIZED) {
    return RouterErrorCode.AUTHENTICATION_FAILED;
  }
  if (status === HTTP_STATUS_FORBIDDEN) {
    return RouterErrorCode.AUTHORIZATION_FAILED;
  }
  if (status === HTTP_STATUS_GONE) {
    return RouterErrorCode.MODEL_RETIRED;
  }
  if (status === HTTP_STATUS_NOT_FOUND) {
    return body && includesAnyHint(body, MODEL_RETIRED_HINTS)
      ? RouterErrorCode.MODEL_RETIRED
      : RouterErrorCode.MODEL_NOT_FOUND;
  }
  if (status === HTTP_STATUS_UNPROCESSABLE) {
    return RouterErrorCode.CAPABILITY_MISMATCH;
  }
  if (status >= HTTP_STATUS_SERVER_ERROR_FLOOR) {
    return RouterErrorCode.PROVIDER_5XX;
  }
  return RouterErrorCode.UNKNOWN;
}

/**
 * Translates a thrown transport error.
 *
 * `httpRequest` aborts its own AbortController when the deadline passes, so an
 * abort with no caller cancellation is a timeout. `cancelled` is passed by the
 * coordinator when the abort came from the caller instead — the two are
 * indistinguishable from the error object alone, and conflating them would
 * report a user pressing stop as a provider timing out.
 */
export function mapThrownErrorToRouterError(error: unknown, cancelled = false): RouterErrorCode {
  if (cancelled) {
    return RouterErrorCode.CANCELLED;
  }
  if (!(error instanceof Error)) {
    return RouterErrorCode.UNKNOWN;
  }
  if (ABORT_ERROR_NAMES.has(error.name)) {
    return RouterErrorCode.TIMEOUT;
  }
  if (includesAnyHint(error.message, NETWORK_ERROR_HINTS)) {
    return RouterErrorCode.NETWORK;
  }

  // `httpRequest` parses every response as JSON, so a provider answering with
  // HTML — a proxy's 502 page is the usual case — throws here and the status is
  // already lost. Classifying that UNKNOWN made it neither retryable nor
  // provider-scoped, so the chain kept hammering a dead provider. These
  // adapters only ever call JSON endpoints, so a non-JSON body is a provider
  // malfunction by definition.
  if (error.name === JSON_PARSE_ERROR_NAME) {
    return RouterErrorCode.PROVIDER_5XX;
  }

  return RouterErrorCode.UNKNOWN;
}

/** Whether an entry may spend its own retry budget on this failure. */
export function isRetryableRouterError(code: RouterErrorCode): boolean {
  return RETRYABLE_ROUTER_ERRORS.has(code);
}

/** How far this failure invalidates the remaining chain. */
export function resolveFailureScope(code: RouterErrorCode): RouterFailureScope {
  return (
    recordGet(ROUTER_ERROR_FAILURE_SCOPE as Readonly<Record<string, RouterFailureScope>>, code) ??
    RouterFailureScope.MODEL
  );
}

/** Whether the deployment record itself should be taken out of rotation. */
export function shouldQuarantineDeployment(code: RouterErrorCode): boolean {
  return QUARANTINING_ROUTER_ERRORS.has(code);
}

/**
 * Whether the chain should stop entirely rather than advance.
 *
 * Kept separate from scope so a caller reads intent instead of comparing enum
 * members at every branch.
 */
export function isTerminalForRequest(code: RouterErrorCode): boolean {
  return resolveFailureScope(code) === RouterFailureScope.REQUEST;
}

/**
 * Whether every later entry on the same provider should be skipped.
 */
export function shouldSkipProvider(code: RouterErrorCode): boolean {
  return resolveFailureScope(code) === RouterFailureScope.PROVIDER;
}
