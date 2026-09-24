/**
 * The models that write an AI-generated file's content are an admin choice on
 * the Smart Router "Assistant models" tab (role FILE_WRITER), not code. They
 * were hard-coded (claude-sonnet-4, gpt-4o-mini, gemini-2.5-flash); when none
 * was exposed every file request failed with "The selected model is not
 * available" (production, 2026-09-19).
 */
export const FILE_WRITER_CANDIDATES_PATH =
  '/api/v1/internal/assistant-models/FILE_WRITER/candidates';

export const FILE_WRITER_CANDIDATES_TIMEOUT_MS = 3_000;

/** Reused this long, so an admin change lands within a minute without a restart. */
export const FILE_WRITER_CANDIDATES_TTL_MS = 60_000;

/** routing-service's name for hosted Ollama -> chat-service's provider for it. */
export const ROUTING_TO_CHAT_PROVIDER: Readonly<Record<string, string>> = {
  OLLAMA_CLOUD: 'OLLAMA',
  OLLAMA: 'local-ollama',
};

/**
 * Words that name a file format in a request, in the order formats are tried
 * when two are equally likely (F3b, ADR-108). Matched as whole words, so
 * "password" is not "word" and "deckhand" is not "deck".
 *
 * F6 (2026-09-24): `\b` is defined over ASCII `\w` only, so it never fires
 * next to a non-Latin letter — an Arabic loanword like "اكسل" (Excel) sits
 * between two `\W` characters (from `\b`'s point of view) and `\bاكسل\b`
 * never matches at all. routing-service already routes such a message to
 * FILE_GENERATION (its own intent detector was fixed the same day), but
 * this detector then fell through to DEFAULT_FILE_FORMAT (TXT) because it
 * could not see the format word either. `wordBoundary` below builds the
 * same whole-word guarantee from `\p{L}\p{N}` instead of `\w`, so it works
 * for every script. Each pattern is a literal (not built from a runtime
 * string), so it stays a fixed, auditable regex rather than dynamic input.
 */
export const FILE_FORMAT_KEYWORDS: ReadonlyArray<readonly [string, RegExp]> = [
  [
    'XLSX',
    /(?<![\p{L}\p{N}])(?:xlsx|xls|excel|spreadsheets?|workbook|اكسل|إكسل)(?![\p{L}\p{N}])/giu,
  ],
  [
    'PPTX',
    /(?<![\p{L}\p{N}])(?:pptx|powerpoint|slides?|slide deck|deck|presentation|بوربوينت|عرض تقديمي|تقديمي|شرائح)(?![\p{L}\p{N}])/giu,
  ],
  ['ZIP', /(?<![\p{L}\p{N}])(?:zip|archive)(?![\p{L}\p{N}])/giu],
  ['PDF', /(?<![\p{L}\p{N}])pdf(?![\p{L}\p{N}])/giu],
  [
    'DOCX',
    /(?<![\p{L}\p{N}])(?:docx|doc|(?:ms |microsoft )word|word(?= doc| document| file| format)|وورد|مستند|documento)(?![\p{L}\p{N}])/giu,
  ],
  ['CSV', /(?<![\p{L}\p{N}])csv(?![\p{L}\p{N}])/giu],
  ['JSON', /(?<![\p{L}\p{N}])json(?![\p{L}\p{N}])/giu],
  ['HTML', /(?<![\p{L}\p{N}])(?:html|web ?page)(?![\p{L}\p{N}])/giu],
  ['MD', /(?<![\p{L}\p{N}])(?:markdown|md)(?![\p{L}\p{N}])/giu],
];

/** "as a pdf", "to Excel", "into slides": the format the user wants, when several are named. */
export const FILE_FORMAT_TARGET_PREFIX = /\b(?:as|to|into|in)\s+(?:an?\s+)?$/iu;

export const DEFAULT_FILE_FORMAT = 'TXT';

/** Fenced as one block from the first line to the last, and nothing else. */
export const WHOLE_CODE_FENCE = /^```[\w+#.-]*\n([\s\S]*?)\n?```$/u;

export const FILE_WRITER_BASE_PROMPT =
  'You write the content of a {FORMAT} file the user asked for. Output only what goes inside the file: no preamble, no explanation, no "here is your file". A standing instruction about how to open or end a chat reply (a greeting, a sign-off, a marker) does not apply to a file: never add it.';

/**
 * How the file writer should shape its output for each format. Every rich
 * format is written as Markdown and converted by file-generation-service
 * (ADR-107): raw HTML is escaped there, so asking for HTML printed tags as text.
 */
export const FILE_WRITER_FORMAT_INSTRUCTIONS: Readonly<Record<string, string>> = {
  PDF: 'Write GitHub-flavoured Markdown: headings, lists, tables, fenced code with a language. Do not write raw HTML.',
  DOCX: 'Write GitHub-flavoured Markdown: headings, lists, tables, fenced code with a language. Do not write raw HTML.',
  HTML: 'Write GitHub-flavoured Markdown; the page is built from it. Do not write raw HTML tags.',
  MD: 'Write GitHub-flavoured Markdown.',
  PPTX: 'Write Markdown: one ## heading per slide with at most 6 short bullets each. A table or code block gets its own slide.',
  XLSX: 'Write the data as Markdown tables. Put a ## heading naming each sheet directly above its table. Keep number cells plain: no thousands separators or currency symbols.',
  // A Markdown table, not raw CSV: file-generation quotes every cell itself.
  // Asked for raw CSV, models left commas unquoted ("time,location,attire")
  // and broke the row in 4 of 1,500 runs (F4 matrix, 2026-09-19).
  CSV: 'Write the data as one Markdown table: a header row, then the data rows. No other text.',
  JSON: 'Output one valid JSON value only. No Markdown fences.',
  TXT: 'Output plain text without Markdown syntax.',
  ZIP: "Write Markdown. Put each file in its own fenced code block with a language, and write the file's relative path alone on the line directly above its block (for example `src/index.ts`). Tables become CSV files.",
};

/**
 * Markdown formats open with a title that names the file: file-generation turns
 * it into the file's name, title and description (F3c, ADR-109). Files used to
 * be called `generated-<ms>.<ext>`.
 */
export const FILE_WRITER_NAMING_INSTRUCTION =
  "Start with one # title in plain words that names the document (it becomes the file's name; write a title, not a filename: no extension, no underscores), then a one-sentence summary paragraph.";

export const NAMED_FILE_FORMATS: readonly string[] = [
  'PDF',
  'DOCX',
  'HTML',
  'MD',
  'PPTX',
  'XLSX',
  'ZIP',
];

/**
 * Formats that are pure data. Their writer gets no INSTRUCTION memories: a
 * saved "always end every reply with X" put X after the table or the JSON in
 * 33 of 37 broken CSVs and every broken JSON of the F4 matrix (2026-09-19).
 */
export const DATA_FILE_FORMATS: readonly string[] = ['CSV', 'JSON'];

/** English text of the file-limit reply; the chat shows a translated notice (ADR-110). */
export const FILE_LIMIT_FALLBACK_TEXT =
  "You've used today's AI-written files on your plan ({used} of {limit}). It resets tomorrow; Download as on any answer still works.";
