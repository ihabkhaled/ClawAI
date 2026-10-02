// Sampling-parameter refusals (2026-10-02).
//
// Production: Anthropic answered `claude-opus-5-5`, `claude-sonnet-5-5` and
// `claude-fable-5-1` with HTTP 400 "`temperature` is deprecated for this
// model." The static list in anthropic-sampling.constants.ts did not know those
// ids, so every turn on them failed and the provider's sentence was stored as
// the assistant's reply. Now the refusal is recognised, the request is resent
// once without the parameter, and the model is remembered so later calls omit
// it up front.

export const SAMPLING_PARAMETER_TEMPERATURE = 'temperature';

// The provider's spelling (lower-cased, `_`/space removed) -> our canonical name.
export const SAMPLING_PARAMETER_CANONICAL_NAMES: ReadonlyMap<string, string> = new Map([
  ['temperature', SAMPLING_PARAMETER_TEMPERATURE],
  ['topp', 'top_p'],
  ['topk', 'top_k'],
  ['presencepenalty', 'presence_penalty'],
  ['frequencypenalty', 'frequency_penalty'],
]);

// A sampling parameter named in a provider's refusal: `temperature`, `top_p`,
// `topP`, "top k", `presence_penalty`, `frequencyPenalty`, ...
export const SAMPLING_PARAMETER_NAME_PATTERN =
  /\b(temperature|top[_ ]?[pk]|(?:presence|frequency)[_ ]?penalty)\b/iu;

// What makes the sentence a refusal OF that parameter rather than a mention.
export const SAMPLING_PARAMETER_REJECTION_PATTERN =
  /deprecated|not supported|unsupported|not allowed|not permitted|does not support|no longer supported|cannot be (?:set|used|specified)/iu;

// Only a request-shape refusal: 400 (Anthropic, OpenAI) or 422 (validation).
export const SAMPLING_PARAMETER_REJECTION_STATUSES: readonly number[] = [400, 422];

// The sampling parameters chat-service actually sends. A refusal naming any
// other one is not retried: the resent body would be identical.
export const RETRYABLE_SAMPLING_PARAMETERS: readonly string[] = [SAMPLING_PARAMETER_TEMPERATURE];

// How long a learned "model X rejects parameter Y" holds before it is tried again.
export const LEARNED_SAMPLING_REJECTION_TTL_MS = 24 * 60 * 60 * 1_000;

export const LEARNED_SAMPLING_REJECTION_MAX_ENTRIES = 1_024;
