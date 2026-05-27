// These caps were originally tuned for sub-second replies on tiny CPU
// models (72/112 tokens ≈ 2-3 short sentences). On real hardware with
// real models the constraint is invisible to the user except as
// mid-sentence truncation — every parallel-compare response returned
// exactly 112 outputTokens and ended mid-word, which made the compare
// grid useless ("can't see the full response").
// New defaults give every layer room for a substantive answer while
// still bounding runaway generation via the hard ceiling.
export const FAST_PATH_MAX_OUTPUT_TOKENS = 512;
export const AUTO_MAX_OUTPUT_TOKENS = 2048;
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
export const HARD_MAX_OUTPUT_TOKENS = 16384;
export const MIN_OUTPUT_TOKENS = 24;
export const FAST_PATH_MAX_PROMPT_CHARS = 220;
export const FAST_PATH_MAX_PROMPT_WORDS = 36;
export const FAST_PATH_MAX_NEWLINES = 1;
export const FAST_PATH_MIN_RESPONSE_CHARS = 42;
export const FAST_PATH_CONTEXT_MAX_MESSAGES = 6;
export const FAST_PATH_CONTEXT_MAX_MEMORIES = 2;
export const FAST_PATH_CONTEXT_MAX_CITATIONS = 2;
export const FAST_PATH_CONTEXT_TOKEN_BUDGET = 1024;
export const FAST_PATH_TARGET_LATENCY_MS = 12_000;
export const STANDARD_TARGET_LATENCY_MS = 20_000;

export const FAST_PATH_COMPLEXITY_PATTERN =
  /(step by step|comprehensive|detailed|thorough|architecture|design|research|analy[sz]e|trade[ -]?off|legal|medical|finance|security|compliance|plan|strategy|debug|implement|refactor|multi[- ]?step|deep dive|long answer)/i;

export const FAST_PATH_OPERATIONAL_PREFIX_PATTERN =
  /^(fix|summarize|rewrite|translate|list|show|give|tell|check|status|convert|format|extract|find|what is|where is|who is|when is)\b/i;

export const FAST_PATH_RESPONSE_CONSTRAINT =
  'Respond briefly in 2-4 sentences, or a short bullet list when needed. No extra preamble.';
