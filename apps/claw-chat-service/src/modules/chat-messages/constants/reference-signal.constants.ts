/**
 * Detectors for "this prompt points at something said earlier".
 *
 * These replace a single sixteen-word regex (`isLikelyFollowUp`) whose `false`
 * answer removed the conversation from the prompt. Measured against phrasings
 * users actually type, that regex answered `false` for `build it`,
 * `implement it`, `use option 3`, `what did you recommend before?` and
 * `make the backend now` — every one of them a reference.
 *
 * The weights order candidates; nothing here can remove a message. See
 * ADR-084.
 */

/** Bare pronouns and demonstratives with no antecedent in the prompt itself. */
export const PRONOUN_PATTERN =
  /(^|\s)(it|its|that|this|those|these|them|they|one|ones)(\s|[.,!?;:]|$)/i;

/** Imperatives that only mean something against a prior artifact. */
export const BARE_IMPERATIVE_PATTERN =
  /^(build|implement|do|make|apply|use|finish|continue|complete|write|generate|create|produce|extend|refactor|fix|improve|expand|shorten|rewrite|rephrase|translate|convert|turn)\b/i;

/** Explicit backward pointers. */
export const TEMPORAL_REFERENCE_PATTERN =
  /\b(earlier|before|previously|previous|above|already|so far|until now|up to now|last time|we discussed|we agreed|you (said|gave|proposed|recommended|suggested|chose|picked|wrote|built|mentioned)|your (answer|recommendation|proposal|architecture|design|plan|code|suggestion|version))\b/i;

/** Selections that name a member of a set the assistant produced. */
export const ORDINAL_SELECTION_PATTERN =
  /\b(option|approach|alternative|variant|choice|version|number)\s*(\d+|one|two|three|four|five)\b|\b(first|second|third|fourth|fifth|latter|former|last)\s+(one|option|approach|version|alternative)\b/i;

/** Definite references to an artifact the conversation is presumed to hold. */
export const DEFINITE_ARTIFACT_PATTERN =
  /\bthe (schema|architecture|design|plan|code|implementation|api|endpoint|model|diagram|list|table|function|class|migration|spec|document|draft|summary|solution|approach|file|script)\b/i;

/** Continuations that carry no subject at all. */
export const CONTINUATION_PATTERN =
  /^(again|another|one more|more|next|go on|keep going|and\b|also\b|now\b|then\b|ok(ay)?[,.]?\s*(now|next|go)?)\b/i;

export const REFERENCE_DETECTORS: ReadonlyArray<{
  name: string;
  pattern: RegExp;
  weight: number;
}> = Object.freeze([
  { name: 'TEMPORAL_REFERENCE', pattern: TEMPORAL_REFERENCE_PATTERN, weight: 0.35 },
  { name: 'ORDINAL_SELECTION', pattern: ORDINAL_SELECTION_PATTERN, weight: 0.3 },
  { name: 'DEFINITE_ARTIFACT', pattern: DEFINITE_ARTIFACT_PATTERN, weight: 0.25 },
  { name: 'BARE_IMPERATIVE', pattern: BARE_IMPERATIVE_PATTERN, weight: 0.2 },
  { name: 'PRONOUN', pattern: PRONOUN_PATTERN, weight: 0.2 },
  { name: 'CONTINUATION', pattern: CONTINUATION_PATTERN, weight: 0.2 },
]);

/** A prompt this short is almost never self-contained. */
export const SHORT_PROMPT_WORDS = 6;
export const SHORT_PROMPT_WEIGHT = 0.15;
