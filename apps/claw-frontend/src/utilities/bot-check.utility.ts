import { HTTP_PRECONDITION_REQUIRED } from '@/constants/bot-check.constants';
import { ApiErrorCode } from '@/enums/api-error-code.enum';

/**
 * True for the server asking for bot checks: code BOT_CHECK_REQUIRED, or a bare
 * 428 (a proxy that dropped the body). Sign-in retries once with checks on it.
 */
export function isBotCheckRequiredError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  const { code, status } = error as { code?: unknown; status?: unknown };
  if (code === ApiErrorCode.BOT_CHECK_REQUIRED) {
    return true;
  }
  return status === HTTP_PRECONDITION_REQUIRED && code === undefined;
}

/**
 * The submit button's label for an auth form: the request in flight wins, then
 * "Checking your browser…" while the click waits on the bot checks, else idle.
 */
export function resolveAuthSubmitLabelKey(
  isRequestPending: boolean,
  isAwaitingChecks: boolean,
  keys: { pending: string; checking: string; idle: string },
): string {
  if (isRequestPending && !isAwaitingChecks) {
    return keys.pending;
  }
  return isAwaitingChecks ? keys.checking : keys.idle;
}
