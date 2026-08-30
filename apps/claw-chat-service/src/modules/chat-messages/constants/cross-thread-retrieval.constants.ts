/**
 * Cross-thread retrieval bounds.
 *
 * Every number here caps a read or a spend. Retrieval across a user's whole
 * history is the one context source that grows without limit as the account
 * ages, so it is the one that must be bounded at every stage rather than
 * trusted to a relevance score. ADR-087.
 */

/** Threads that survive stage 1 ranking. */
export const CROSS_THREAD_CANDIDATE_LIMIT = 10;

/**
 * Matching messages read while ranking threads in stage 1.
 *
 * A hit count over a bounded window, not a full count: the question stage 1
 * answers is "which threads talk about this", and the top of a recency-ordered
 * window answers it without counting every match in an account's history.
 */
export const CROSS_THREAD_CANDIDATE_SCAN_LIMIT = 200;

/** Threads that survive stage 1 and have their messages read in stage 2. */
export const CROSS_THREAD_SELECTED_LIMIT = 3;

/** Messages read per selected thread. */
export const CROSS_THREAD_MESSAGES_PER_THREAD = 40;

/** Messages that may reach the prompt, across all selected threads combined. */
export const CROSS_THREAD_PROMPT_MESSAGE_LIMIT = 8;

/**
 * Share of the input budget cross-thread material may take.
 *
 * Kept deliberately small. The current conversation is what the user is
 * actually in; another thread's content earns its place only by being clearly
 * relevant, and a large share would let history crowd out the live discussion.
 */
export const CROSS_THREAD_BUDGET_SHARE = 0.15;

/**
 * Minimum hybrid score for a thread to be read at all.
 *
 * Higher than the same-thread threshold on purpose. Inside a thread, a weak
 * match costs a little budget. Across threads, a weak match imports an
 * unrelated conversation into this one, which is worse than sending nothing.
 */
export const CROSS_THREAD_THREAD_SCORE_THRESHOLD = 0.28;

/**
 * Score a thread starts from when it was found by a coined identifier.
 *
 * Above `CROSS_THREAD_THREAD_SCORE_THRESHOLD` on purpose: matching
 * `MERIDIAN-88` is not weak evidence that the thread is about MERIDIAN-88, and
 * making such a thread also clear a relevance bar computed from its title would
 * discard the strongest signal the feature has.
 */
export const CROSS_THREAD_IDENTIFIER_MATCH_SCORE = 0.35;

/** Minimum score for an individual message once its thread has been selected. */
export const CROSS_THREAD_MESSAGE_SCORE_THRESHOLD = 0.22;

/**
 * A prompt shorter than this in meaningful tokens does not trigger retrieval.
 *
 * "ok", "thanks" and "go on" match many old conversations weakly and none of
 * them strongly. Retrieval on such a prompt is noise by construction.
 */
export const CROSS_THREAD_MIN_INTENT_TOKENS = 3;
