import {
  HTTP_STATUS_CONFLICT,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_PAYMENT_REQUIRED,
} from '@/constants/http-status.constants';
import {
  THREAD_SAFE_ERROR_CODE_PATTERN,
  THREAD_START_ERROR_KEYS,
} from '@/constants/thread-generation-progress.constants';
import { ApiClientError } from '@/services/shared/api-client';
import type { ThreadErrorMessage } from '@/types/thread-generation-progress.types';

/**
 * What to tell the owner when a Thread request fails. The status decides, so a
 * missing Thread, a plan block and an empty credit wallet never share the one
 * generic sentence. A known start-refusal code (ADR-174) wins over the status, because
 * it says exactly what to fix. Only a code that looks like a machine code is echoed back.
 */
export function resolveThreadErrorMessage(error: unknown): ThreadErrorMessage {
  if (error instanceof ApiClientError) {
    const startKey = error.code === undefined ? undefined : THREAD_START_ERROR_KEYS[error.code];
    if (startKey !== undefined) {
      return { key: `chat.threadProgress.startError.${startKey}` };
    }
    if (error.status === HTTP_STATUS_NOT_FOUND) {
      return { key: 'chat.threadProgress.error.notFound' };
    }
    if (error.status === HTTP_STATUS_FORBIDDEN) {
      return { key: 'chat.threadPlanRequired' };
    }
    if (error.status === HTTP_STATUS_CONFLICT) {
      return { key: 'chat.threadProgress.error.conflict' };
    }
    if (error.status === HTTP_STATUS_PAYMENT_REQUIRED) {
      return { key: 'chat.threadProgress.error.credit' };
    }
    if (error.code !== undefined && THREAD_SAFE_ERROR_CODE_PATTERN.test(error.code)) {
      return { key: 'chat.threadProgress.error.genericWithCode', params: { code: error.code } };
    }
  }
  return { key: 'chat.threadProgress.error.generic' };
}

/** True when the service answered 404 (not found, or not the owner's). */
export function isThreadNotFoundError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === HTTP_STATUS_NOT_FOUND;
}

/** True when polling again cannot help: the Thread is gone or no longer the viewer's (404 or 403). */
export function isThreadPollFatalError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    (error.status === HTTP_STATUS_NOT_FOUND || error.status === HTTP_STATUS_FORBIDDEN)
  );
}

/** True when the service refused to start a generation with one of the ADR-174 machine codes. */
export function isThreadStartRefusal(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    error.code !== undefined &&
    THREAD_START_ERROR_KEYS[error.code] !== undefined
  );
}
