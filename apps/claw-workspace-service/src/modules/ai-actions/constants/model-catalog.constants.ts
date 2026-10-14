export const MODEL_CATALOG_FETCH_TIMEOUT_MS = 5000;

/**
 * connector-service route that lists what the model picker offers: enabled
 * connector, ACTIVE + EXPOSED + CHAT model. AUTO reads the same list a signed-in
 * user picks from, so it can never choose a model nobody is allowed to select.
 * Providers are rows in that list, never names in this service's code.
 */
export const MODEL_CATALOG_PUBLIC_PATH = '/api/v1/internal/connectors/public-catalog';

/** How long a catalog that could not be fully read is reused before the next attempt. */
export const MODEL_CATALOG_FAILURE_TTL_MS = 15_000;

/** A model whose published window is at least this wide satisfies a long-context hint. */
export const LONG_CONTEXT_MIN_TOKENS = 128_000;

/** Providers kept in an AUTO fallback chain (primary + this many alternatives). */
export const AUTO_CLOUD_FALLBACK_LIMIT = 3;

/** Capability hints a catalog model satisfies through its published flags. */
export const STRUCTURED_OUTPUT_HINTS: ReadonlySet<string> = new Set([
  'structured_output',
  'json',
  'extraction',
]);
export const LONG_CONTEXT_HINTS: ReadonlySet<string> = new Set(['long_context', 'planning']);
export const TOOL_HINTS: ReadonlySet<string> = new Set(['coding']);

/** Cost band order from the catalog, cheapest first. Equal fit prefers the cheaper band. */
export const USAGE_TIER_COST_RANK: ReadonlyMap<string, number> = new Map([
  ['LOW', 0],
  ['MEDIUM', 1],
  ['HIGH', 2],
  ['EXTRA_HIGH', 3],
]);

/** Rank of a model whose cost band the catalog does not state. */
export const UNKNOWN_USAGE_TIER_RANK = 2;

/** Coded errors for an AUTO run that has nothing to run on. The sentence is what the user reads. */
export const AI_ACTION_NO_MODEL_CODE = 'AI_ACTION_NO_MODEL_AVAILABLE';
export const AI_ACTION_NO_MODEL_MESSAGE =
  'No AI model is available for your plan right now. Choose a model manually or try again later.';
export const AI_ACTION_PRIVATE_NO_LOCAL_CODE = 'AI_ACTION_PRIVATE_REQUIRES_LOCAL_MODEL';
export const AI_ACTION_PRIVATE_NO_LOCAL_MESSAGE =
  'Private actions only run on a local model, and none is installed.';
export const AI_ACTION_PLAN_LOOKUP_CODE = 'AI_ACTION_PLAN_LOOKUP_UNAVAILABLE';
export const AI_ACTION_PLAN_LOOKUP_MESSAGE =
  'Your plan could not be checked right now. Try again in a moment.';

/** chat-service `workflow` tags: what the PAYG ledger shows for each caller. */
export const AI_ACTION_WORKFLOW_RUN = 'workspace-ai-action';
export const AI_ACTION_WORKFLOW_REVIEW = 'workspace-multi-review';
export const AI_ACTION_WORKFLOW_REVIEW_JUDGE = 'workspace-multi-review-judge';
export const AI_ACTION_WORKFLOW_CHAIN_DRAFT = 'workspace-chain-draft';
