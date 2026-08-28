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
// Entries are the undated ids Anthropic publishes for these models; a dated
// snapshot suffix is stripped before comparison, so `-YYYYMMDD` variants match.
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
