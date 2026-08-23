// Schemes that must never survive sanitisation, compared against the fully
// decoded and whitespace-stripped target so encoded and padded spellings of
// the same payload are caught too.
export const FEEDBACK_DANGEROUS_URL_SCHEMES: readonly string[] = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
];

// The handful of named entities that can be used to disguise a scheme.
export const FEEDBACK_HTML_ENTITY_REPLACEMENTS: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  colon: ':',
  tab: '\t',
  newline: '\n',
};

// Bounded so a deliberately self-referential encoding cannot spin the loop.
export const FEEDBACK_MAX_DECODE_PASSES = 5;
