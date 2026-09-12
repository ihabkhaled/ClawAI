// RTF reader limits and lookup tables.
//
// These live here rather than beside the parser because rule 12 puts every
// top-level declaration in a constants file — the architecture ESLint rule
// enforces it, and a logic file that grows its own constants is how a utility
// turns into a module nobody can reuse.

// The RTF spec caps a control word at 32 letters; anything longer is malformed.
export const MAX_CONTROL_WORD_LENGTH = 32;

// Enough for any real parameter, and a bound on an attacker-supplied run of
// digits. Both quantifiers are bounded deliberately: this reader runs over a
// file someone uploaded.
export const MAX_CONTROL_PARAMETER_DIGITS = 10;

// Groups whose entire contents are metadata, never body text. Keeping them
// would put font names and colour tables into the model's prompt.
export const DISCARDED_DESTINATIONS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'info',
  'pict',
  'object',
  'themedata',
  'colorschememapping',
  'latentstyles',
  'datastore',
  'generator',
  'listtable',
  'listoverridetable',
  'rsidtbl',
  'xmlnstbl',
]);

// Control words that stand for a character rather than a formatting change.
export const LITERAL_CONTROL_WORDS = new Map<string, string>([
  ['par', '\n'],
  ['line', '\n'],
  ['sect', '\n\n'],
  ['page', '\n\n'],
  ['tab', '\t'],
  ['cell', '\t'],
  ['row', '\n'],
  ['emdash', '—'],
  ['endash', '–'],
  ['lquote', '‘'],
  ['rquote', '’'],
  ['ldblquote', '“'],
  ['rdblquote', '”'],
  ['bullet', '•'],
  ['nbsp', ' '],
]);
