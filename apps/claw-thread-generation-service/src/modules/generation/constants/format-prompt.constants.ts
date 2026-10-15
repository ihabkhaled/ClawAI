/** JSON reply the format stage must return; the key stays English whatever the article language. */
export const FORMAT_REPLY_SHAPE = '{"markdown": string}';

/** Step log codes of the optional FORMAT stage (ADR-189). Every SKIPPED code leaves the article as it was. */
export const FORMAT_SKIPPED_ALREADY_PRETTY = 'FORMAT_ALREADY_PRETTY';
export const FORMAT_SKIPPED_BUDGET = 'FORMAT_SKIPPED_BUDGET';
export const FORMAT_SKIPPED_FAILED = 'FORMAT_FAILED';
export const FORMAT_ROLE_ID = 'format';
/** Budget request id prefix of an owner-asked pass, so it never collides with a job's own key. */
export const FORMAT_REQUEST_PREFIX = 'format:';
/** Cap of the small budget one owner-asked pass reserves: $0.10, in micro-USD. */
export const FORMAT_PASS_CAP_MICRO_USD = 100_000;

/** The format stage rewrites structure only; it must not need more room than the article plus markup. */
export const FORMAT_OUTPUT_FACTOR = 1.6;
export const FORMAT_MIN_OUTPUT_TOKENS = 2_048;
export const FORMAT_MAX_OUTPUT_TOKENS = 32_768;
/** The word count of the formatted article may differ from the original by this share. */
export const FORMAT_WORD_DRIFT_PERCENT = 15;
/** A format pass is skipped once the job has spent this share of its cap (same line as ADR-181 healing). */
export const FORMAT_SPEND_CEILING_PERCENT = 85;
/** Format runs one model call and one retry, never more. */
export const FORMAT_HEAL_ATTEMPTS = 1;

/** English words that must not head a section of a non-English article. */
export const ENGLISH_HEADING_WORDS: readonly string[] = [
  'key takeaways',
  'takeaways',
  'summary',
  'sources',
  'references',
  'introduction',
  'conclusion',
  'overview',
  'table of contents',
];

export const FORMAT_SYSTEM_RULES = [
  'You are a typesetter. You restructure an already reviewed article into clean GitHub-flavoured Markdown. You change layout only, never content.',
  'NEVER add, remove, reword into a different meaning, or invent any fact, number, date, name, quotation or source. Every sentence of meaning in the input must remain.',
  'Keep every citation marker such as [abc123] exactly as written (ASCII brackets, ASCII letters and digits), next to the claim it supports. Never move a marker to a different claim and never delete one.',
  'Keep every number, date, unit, name and url exactly as written.',
  'Structure: exactly one H1 title (the existing title). Then, right under it, a "Key takeaways" bullet list of 2 to 4 short bullets, or a 2 to 3 sentence summary, built only from what the article already says.',
  'Use H2 sections and H3 subsections with short descriptive headings. Paragraphs have at most 4 sentences. Use bullet lists for enumerations and numbered lists for ordered steps.',
  'Use a GitHub-flavoured Markdown table (header row, a separator row, one row per item, consistent columns) for any comparison or specification data that the article already lists in prose.',
  'Write notable definitions or cautions as blockquotes that start with "> **Note:** ", "> **Tip:** " or "> **Warning:** " (the label word is translated into the article language).',
  'End with a "Sources" list of the urls already cited, one per line as a bullet, with no new urls. Translate the words "Key takeaways" and "Sources" into the article language; no heading may stay in English in a non-English article.',
  'Right-to-left (Arabic, Persian) and unspaced (Japanese, Chinese, Thai) text stays in its own script and punctuation; do not insert spaces or switch language. Do not add raw HTML, images, code fences around the whole answer, or commentary.',
  'If the article is already well structured, return it unchanged.',
];
