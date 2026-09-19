/**
 * File-generation intent (F0, 2026-09-19).
 *
 * The old rule matched any verb substring plus any format substring, so
 * "can you re-write normally text for google docs, not in markdown" matched
 * "write" + "markdown" and was sent to file generation, which then failed.
 * Now: whole words only; a negated format ("not in markdown", "no pdf") does
 * not count; and a SOFT word (markdown, docs, report...) needs a STRONG
 * artifact word or a delivery verb next to it.
 */

/** Words that on their own mean "give me a file". */
export const FILE_INTENT_STRONG_WORDS: readonly string[] = [
  'file',
  'files',
  'pdf',
  'docx',
  'xlsx',
  'pptx',
  'csv',
  'zip',
  'spreadsheet',
  'excel',
  'powerpoint',
  'slides',
  'deck',
  'presentation',
  'downloadable',
  'attachment',
];

/** Formats that only mean a file when a strong word or delivery verb is present. */
export const FILE_INTENT_SOFT_WORDS: readonly string[] = [
  'markdown',
  'md',
  'txt',
  'text',
  'json',
  'html',
  'document',
  'doc',
  'docs',
  'word',
  'report',
  'memo',
  'proposal',
  'brief',
  'one-pager',
];

/** Verbs that ask for delivery of an artifact, not for prose. */
export const FILE_INTENT_DELIVERY_VERBS: readonly string[] = [
  'download',
  'export',
  'attach',
  'save',
];

/** Verbs that make an artifact when paired with a strong word. */
export const FILE_INTENT_CREATE_VERBS: readonly string[] = [
  'generate',
  'create',
  'make',
  'write',
  'produce',
  'build',
  'give',
  'prepare',
  'convert',
  'turn',
  'compile',
  'package',
  'zip',
  'bundle',
];

/** Phrases that are a file request on their own. */
export const FILE_INTENT_PHRASES: readonly string[] = [
  'export as',
  'export to',
  'save as',
  'download as',
  'save to file',
  'write to file',
  'as a file',
  'as file',
  'into a file',
];

/** Negations that cancel the format word that follows them within 3 words. */
export const FILE_INTENT_NEGATIONS: readonly string[] = [
  'not',
  'no',
  'without',
  "don't",
  'dont',
  'never',
  'instead of',
];

export const FILE_INTENT_NEGATION_WINDOW = 3;

/** File extensions typed literally (".pdf", "report.docx"). */
export const FILE_INTENT_EXTENSION =
  /\.(pdf|docx?|xlsx?|pptx?|csv|md|txt|json|html?|zip|py|ts|js|sql)\b/u;

/**
 * A how/what/why question asks for knowledge, not a file ("how do I convert
 * a doc to pdf?"), unless it asks for something FOR the user ("can you make
 * me a pdf").
 */
export const FILE_INTENT_QUESTION =
  /^\s*(how (do|can|to|does)|what|why|which|is|are|does|should|when)\b/u;
export const FILE_INTENT_FOR_ME = /\b(for me|give me|make me|send me|create me|generate me)\b/u;
