/**
 * Why a message the user can see in the thread was not put in front of the
 * model.
 *
 * Recorded per omitted message so "the message is visibly in the thread" and
 * "the model was actually given it" stop being the same claim. Before this
 * existed, a message could be dropped by a lexical-overlap rule and nothing
 * anywhere said so — not a log line, not the receipt, not the UI.
 */
export enum ContextOmissionReason {
  /** No room left after everything of higher priority was placed. */
  TOKEN_BUDGET_EXHAUSTED = 'TOKEN_BUDGET_EXHAUSTED',
  /** Older than the recent window and not relevant enough to retrieve back. */
  LOW_RELEVANCE = 'LOW_RELEVANCE',
  /** A later message replaced the value this one stated. */
  SUPERSEDED = 'SUPERSEDED',
  /** An empty or content-free row (a placeholder, a cancelled generation). */
  EMPTY_CONTENT = 'EMPTY_CONTENT',
  /** Dropped by a policy gate, e.g. the local-only attachment gate. */
  POLICY_GATE = 'POLICY_GATE',
}
