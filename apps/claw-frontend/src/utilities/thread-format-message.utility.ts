import {
  THREAD_FORMAT_ALREADY_PRETTY_CODE,
  THREAD_FORMAT_DAILY_LIMIT_CODE,
  THREAD_FORMAT_IN_PROGRESS_CODE,
} from '@/constants/thread-format.constants';
import { ApiClientError } from '@/services/shared/api-client';
import { resolveThreadErrorMessage } from '@/utilities/thread-error-message.utility';

/** The translation key for a failed formatting request. Plan and allowance refusals keep their own text. */
export function threadFormatErrorKey(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === THREAD_FORMAT_DAILY_LIMIT_CODE) {
      return 'threadArticle.formatLimit';
    }
    if (error.code === THREAD_FORMAT_IN_PROGRESS_CODE) {
      return 'threadArticle.formatBusy';
    }
    if (error.status === 403) {
      return resolveThreadErrorMessage(error).key;
    }
  }
  return 'threadArticle.formatFailed';
}

/** The note shown when the pass changed nothing: already good, or the guard kept the original. */
export function threadFormatSkippedKey(code: string | null): string {
  return code === THREAD_FORMAT_ALREADY_PRETTY_CODE
    ? 'threadArticle.formatUnchanged'
    : 'threadArticle.formatSkipped';
}
