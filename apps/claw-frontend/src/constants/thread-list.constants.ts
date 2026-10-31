import { ThreadListStatus } from '@/enums/thread-list-status.enum';

/** Rows per page on the owner's Threads list. Fixed: the service pages at ten. */
export const THREAD_LIST_PAGE_SIZE = 10;

/** How long the search box waits after the last keystroke before it asks the service. */
export const THREAD_LIST_SEARCH_DEBOUNCE_MS = 300;

/** Longest search text the list keeps in the address. */
export const THREAD_LIST_QUERY_MAX_CHARS = 120;

/** Prefix shared with every other "mine" query, so any publish/delete elsewhere refreshes the list. */
export const THREAD_LIST_QUERY_KEY_BASE = ['thread-publications', 'mine'] as const;

export const THREAD_LIST_STATUS_VALUES: readonly ThreadListStatus[] = [
  ThreadListStatus.ALL,
  ThreadListStatus.GENERATING,
  ThreadListStatus.READY,
  ThreadListStatus.PUBLISHED,
  ThreadListStatus.FAILED,
];

/** Status to the key of its label in the Threads list translations. */
export const THREAD_LIST_STATUS_LABEL_KEYS = {
  [ThreadListStatus.ALL]: 'threadListStatusAll',
  [ThreadListStatus.GENERATING]: 'threadListStatusGenerating',
  [ThreadListStatus.READY]: 'threadListStatusReady',
  [ThreadListStatus.PUBLISHED]: 'threadListStatusPublished',
  [ThreadListStatus.FAILED]: 'threadListStatusFailed',
} as const;

export const THREAD_LIST_SKELETON_ROWS = 5;

/** Failure codes the service reports that the list explains itself, to their list string. */
export const THREAD_LIST_REASON_KEYS: Readonly<
  Record<
    string,
    'threadListReasonCancelled' | 'threadListReasonRevoked' | 'threadListReasonMissing'
  >
> = {
  JOB_CANCELLED: 'threadListReasonCancelled',
  PUBLICATION_REVOKED: 'threadListReasonRevoked',
  GENERATION_JOB_MISSING: 'threadListReasonMissing',
};
