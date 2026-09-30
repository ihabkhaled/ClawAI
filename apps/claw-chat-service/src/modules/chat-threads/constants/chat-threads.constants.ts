export const THREAD_CREATED_EVENT = 'thread.created';

/**
 * How many direct branches a lineage view lists. A person exploring a question
 * makes a handful; the cap bounds the query, not the feature — branches beyond
 * it still exist and still appear in the thread list.
 */
export const THREAD_LINEAGE_BRANCH_LIMIT = 50;

/** Fields a lineage entry needs — the select shared by every lineage read. */
export const THREAD_LINEAGE_SELECT = {
  id: true,
  title: true,
  createdAt: true,
  branchedFromMessageId: true,
} as const;
