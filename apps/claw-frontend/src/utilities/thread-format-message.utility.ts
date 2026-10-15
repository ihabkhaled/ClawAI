import {
  THREAD_FORMAT_ALREADY_PRETTY_CODE,
  THREAD_FORMAT_CODE_KEYS,
  THREAD_FORMAT_CODE_PREFIX,
  THREAD_FORMAT_DAILY_LIMIT_CODE,
  THREAD_FORMAT_IN_PROGRESS_CODE,
  THREAD_FORMAT_NOT_FORMATTABLE_CODE,
} from '@/constants/thread-format.constants';
import { ApiClientError } from '@/services/shared/api-client';
import type { ThreadFormatMessage } from '@/types/thread-format.types';
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
    if (error.code === THREAD_FORMAT_NOT_FORMATTABLE_CODE) {
      return 'threadReview.formatNotFormattable';
    }
    if (error.status === 403) {
      return resolveThreadErrorMessage(error).key;
    }
  }
  return 'threadArticle.formatFailed';
}

/** True for a `FORMAT_*` skip code (known or not): a safe outcome the owner is told about, not an error. */
export function isThreadFormatSkipCode(code: string | null | undefined): code is string {
  return typeof code === 'string' && code.startsWith(THREAD_FORMAT_CODE_PREFIX);
}

/** The sentence for one `FORMAT_*` skip code; an unknown one falls back to a generic line that shows the code. */
export function threadFormatCodeMessage(code: string): ThreadFormatMessage {
  const key = THREAD_FORMAT_CODE_KEYS[code];
  return key === undefined ? { key: 'threadReview.formatUnknown', params: { code } } : { key };
}

/** The note shown when the pass changed nothing: already good, or the guard kept the original (with the reason). */
export function threadFormatSkippedMessage(code: string | null): ThreadFormatMessage {
  if (code === THREAD_FORMAT_ALREADY_PRETTY_CODE) {
    return { key: 'threadArticle.formatUnchanged' };
  }
  if (isThreadFormatSkipCode(code)) {
    return threadFormatCodeMessage(code);
  }
  return { key: 'threadArticle.formatSkipped' };
}
