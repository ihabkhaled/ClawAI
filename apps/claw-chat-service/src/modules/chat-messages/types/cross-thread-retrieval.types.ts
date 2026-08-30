/** A thread that might be worth reading, before its messages have been read. */
export type CrossThreadCandidate = {
  threadId: string;
  title: string | null;
  updatedAt: Date;
  /** How many of this thread's messages matched a salient search term. */
  matchingMessageCount: number;
};

/** One message from another thread, with the thread it came from. */
export type CrossThreadMessageRow = {
  messageId: string;
  threadId: string;
  threadTitle: string | null;
  role: string;
  content: string;
  createdAt: Date;
};

/**
 * A message selected for the prompt, with the score that selected it.
 *
 * The score travels because the manifest reports it. "Why is my old project in
 * this conversation?" has to be answerable with a number, not a shrug.
 */
export type CrossThreadSelection = {
  messageId: string;
  threadId: string;
  threadTitle: string | null;
  role: string;
  content: string;
  score: number;
  reasons: string[];
};

/** Everything a generation used from other conversations, and why. */
export type CrossThreadRetrievalResult = {
  /** Empty whenever the feature is off, the intent is trivial, or nothing scored. */
  selections: CrossThreadSelection[];
  /** Threads whose messages were read in stage 2. */
  searchedThreadIds: string[];
  /** Threads that reached the prompt. A subset of `searchedThreadIds`. */
  usedThreadIds: string[];
  /** Why retrieval did nothing, when it did nothing. */
  skippedReason: CrossThreadSkipReason | null;
  estimatedTokens: number;
};

export enum CrossThreadSkipReason {
  /** The thread's `useCrossThreadContext` is false. The default. */
  DISABLED = 'DISABLED',
  /** The prompt carries too few meaningful tokens to retrieve against. */
  INTENT_TOO_SHORT = 'INTENT_TOO_SHORT',
  /** The user has no other non-archived threads. */
  NO_CANDIDATES = 'NO_CANDIDATES',
  /** Candidates existed; none scored above the threshold. */
  NO_RELEVANT_THREAD = 'NO_RELEVANT_THREAD',
  /** A relevant thread was found, but no individual message cleared the bar. */
  NO_RELEVANT_MESSAGE = 'NO_RELEVANT_MESSAGE',
  /** The input budget left no room for anything from another conversation. */
  NO_BUDGET = 'NO_BUDGET',
  /** The read failed. The current conversation proceeds without it. */
  RETRIEVAL_FAILED = 'RETRIEVAL_FAILED',
}
