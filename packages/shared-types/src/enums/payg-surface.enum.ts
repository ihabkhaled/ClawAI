/**
 * Which product surface spent a user's PAYG credit.
 *
 * Recorded on every ledger row because "where did my $5 go" is otherwise
 * unanswerable, and an unanswerable spend question becomes a support ticket and
 * then a chargeback. The billing page renders this directly.
 *
 * One member per place that can reach a paid provider. Adding a new surface
 * without adding a member here is what lets spend become anonymous again, so
 * `rules/37-payg-credit-integrity.md` requires the two to change together.
 */
export enum PaygSurface {
  /** Ordinary chat, including regenerate and edit-resend. */
  CHAT = 'CHAT',
  /** Compare mode — one row per lane, not one per run. */
  COMPARE = 'COMPARE',
  /** The judge / critic second pass over a compare run. */
  JUDGE = 'JUDGE',
  /** The nine advanced orchestration labs. `workflow` narrows which one. */
  ORCHESTRATION = 'ORCHESTRATION',
  /** Image generation, including each attempt of an auto-fallback chain. */
  IMAGE = 'IMAGE',
  /** Document/file content generation. */
  FILE_GENERATION = 'FILE_GENERATION',
  /** The runtime-v2 agent loop behind the coding agent. One row per turn. */
  CODING_AGENT = 'CODING_AGENT',
  /** Workspace AI actions, multi-model review, chain drafting, handoff. */
  WORKSPACE_ACTION = 'WORKSPACE_ACTION',
  /** Router-initiated inference triggered by a message event. */
  ROUTING = 'ROUTING',
}

// Deliberately NOT a member: RESEARCH. Research enrichment reaches search SaaS
// (Brave, Exa, Tavily, ...), never a paid model, and is metered separately
// through FeatureUsageRecord's WEB_SEARCH / WEB_FETCH / WEB_EXTRACT allowances.
// A member with no producer is worse than an absent one - it makes the enum
// claim a spend path the system does not actually attribute, and it defeats the
// exhaustiveness test that stops a NEW paid surface from shipping anonymously.
