export const FAST_PATH_MAX_OUTPUT_TOKENS = 96;
export const AUTO_MAX_OUTPUT_TOKENS = 128;
export const DEFAULT_MAX_OUTPUT_TOKENS = 256;
export const HARD_MAX_OUTPUT_TOKENS = 512;
export const MIN_OUTPUT_TOKENS = 32;
export const FAST_PATH_MAX_PROMPT_CHARS = 220;
export const FAST_PATH_MAX_PROMPT_WORDS = 36;
export const FAST_PATH_MAX_NEWLINES = 1;

export const FAST_PATH_COMPLEXITY_PATTERN =
  /(step by step|comprehensive|detailed|thorough|architecture|design|research|analy[sz]e|trade[ -]?off|legal|medical|finance|security|compliance|plan|strategy|debug|implement|refactor|multi[- ]?step|deep dive|long answer)/i;

export const FAST_PATH_OPERATIONAL_PREFIX_PATTERN =
  /^(fix|summarize|rewrite|translate|list|show|give|tell|check|status|convert|format|extract|find|what is|where is|who is|when is)\b/i;

export const FAST_PATH_RESPONSE_CONSTRAINT =
  'Respond briefly in 2-4 sentences, or a short bullet list when needed. No extra preamble.';
