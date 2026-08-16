import { RouterErrorCode } from '../../../common/enums';
import {
  SAFE_MESSAGE_MAX_LENGTH,
  UNKNOWN_PROVIDER_MESSAGE,
} from '../constants/router-adapter.constants';
import {
  mapHttpStatusToRouterError,
  mapThrownErrorToRouterError,
} from './router-error-mapping.utility';
import type { RouterInferenceFailure } from '../types/router-inference.types';

/**
 * Pulls a human-readable message out of a provider error body.
 *
 * Providers disagree on shape — `{error:{message}}`, `{error:"..."}`,
 * `{message}` — so all three are tried before giving up. The result is
 * truncated because it lands on an attempt record that reaches a trace event.
 */
export function extractProviderMessage(body: unknown): string {
  if (typeof body === 'string' && body.length > 0) {
    return body.slice(0, SAFE_MESSAGE_MAX_LENGTH);
  }
  if (body !== null && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const error = record['error'];

    if (typeof error === 'string' && error.length > 0) {
      return error.slice(0, SAFE_MESSAGE_MAX_LENGTH);
    }
    if (error !== null && typeof error === 'object') {
      const nested = (error as Record<string, unknown>)['message'];
      if (typeof nested === 'string' && nested.length > 0) {
        return nested.slice(0, SAFE_MESSAGE_MAX_LENGTH);
      }
    }
    const message = record['message'];
    if (typeof message === 'string' && message.length > 0) {
      return message.slice(0, SAFE_MESSAGE_MAX_LENGTH);
    }
  }
  return UNKNOWN_PROVIDER_MESSAGE;
}

/** Builds the canonical failure for a non-2xx provider response. */
export function failureFromHttpStatus(
  status: number,
  body: unknown,
  latencyMs: number,
): RouterInferenceFailure {
  const safeMessage = extractProviderMessage(body);
  return {
    ok: false,
    code: mapHttpStatusToRouterError(status, safeMessage),
    safeMessage,
    latencyMs,
  };
}

/** Builds the canonical failure for a thrown transport error. */
export function failureFromThrown(
  error: unknown,
  latencyMs: number,
  cancelled = false,
): RouterInferenceFailure {
  const code = mapThrownErrorToRouterError(error, cancelled);
  return {
    ok: false,
    code,
    // The error's own message can embed a URL or a payload fragment, so the
    // canonical code is reported instead of forwarding provider text.
    safeMessage: code,
    latencyMs,
  };
}

/** A provider that answered 2xx but with no usable content. */
export function emptyContentFailure(latencyMs: number): RouterInferenceFailure {
  return {
    ok: false,
    code: RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT,
    safeMessage: 'provider returned no content',
    latencyMs,
  };
}
