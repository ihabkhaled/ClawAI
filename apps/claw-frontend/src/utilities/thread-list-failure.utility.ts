import { THREAD_LIST_REASON_KEYS } from '@/constants/thread-list.constants';
import type { ThreadListFailure, ThreadListFailureView } from '@/types/thread-list.types';
import { resolveThreadFailureKeys } from '@/utilities/thread-generation-progress.utility';

const UNKNOWN_CODE_KEY = 'chat.threadProgress.code.unknown';

/**
 * The short human reason for a failed Thread. Only the machine code is used: a list reason, else
 * the shared progress sentence, else a generic list sentence. Neither provider text nor a raw
 * code ever reaches the row.
 */
export function describeThreadListFailure(failure: ThreadListFailure): ThreadListFailureView {
  const retryable = failure.retryable;
  const listKey = THREAD_LIST_REASON_KEYS[failure.code];
  if (listKey !== undefined) {
    return { listKey, messageKey: null, params: {}, retryable };
  }
  const keys = resolveThreadFailureKeys(failure.code);
  if (keys.messageKey === UNKNOWN_CODE_KEY) {
    return { listKey: 'threadListReasonGeneric', messageKey: null, params: {}, retryable };
  }
  return { listKey: null, messageKey: keys.messageKey, params: keys.params, retryable };
}
