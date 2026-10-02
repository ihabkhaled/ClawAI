// Claude models that removed the sampling controls.
//
// `temperature`, `top_p` and `top_k` are not merely ignored on these models —
// the request is rejected outright with HTTP 400 ("`temperature` is deprecated
// for this model"). A thread carrying any temperature at all therefore fails
// every turn, which reads to the user as "every available AI provider failed"
// rather than as one unsupported parameter.
//
// Models NOT listed here still accept sampling: Opus 4.6, Sonnet 4.6, and the
// whole 4.5 generation and older. That is why a thread on `claude-opus-4-5`
// answers normally while the same thread on `claude-opus-5` cannot.
//
// Entries are model FAMILIES: an entry matches itself and every id that
// extends it with `-<suffix>` — point releases (`claude-opus-5-5`,
// `claude-fable-5-1`) and dated snapshots (`-YYYYMMDD`) alike. Production,
// 2026-10-02: exact matching missed `claude-opus-5-5`, `claude-sonnet-5-5` and
// `claude-fable-5-1`, and every turn on them was a 400. A model this list
// still misses is learned at runtime (sampling-parameter-support.manager.ts).
export const ANTHROPIC_MODELS_WITHOUT_SAMPLING: readonly string[] = [
  'claude-fable-5',
  'claude-mythos-5',
  'claude-opus-5',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-sonnet-5',
];

// Anthropic dates a model snapshot with a trailing `-YYYYMMDD`.
export const ANTHROPIC_MODEL_SNAPSHOT_SUFFIX = /-\d{8}$/;

// OpenRouter (and other aggregators) prefix the vendor: `anthropic/claude-opus-5-5`.
export const ANTHROPIC_MODEL_VENDOR_PREFIX = /^anthropic\//;

// Separates a family id from its point-release or snapshot suffix.
export const ANTHROPIC_MODEL_FAMILY_SEPARATOR = '-';
