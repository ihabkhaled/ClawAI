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
 */
export const FILE_FORMAT_KEYWORDS: ReadonlyArray<readonly [string, RegExp]> = [
  ['XLSX', /\b(?:xlsx|xls|excel|spreadsheets?|workbook)\b/giu],
  ['PPTX', /\b(?:pptx|powerpoint|slides?|slide deck|deck|presentation)\b/giu],
  ['ZIP', /\b(?:zip|archive)\b/giu],
  ['PDF', /\b(?:pdf)\b/giu],
  ['DOCX', /\b(?:docx|doc|(?:ms |microsoft )word|word (?=doc|document|file|format))/giu],
  ['CSV', /\b(?:csv)\b/giu],
  ['JSON', /\b(?:json)\b/giu],
  ['HTML', /\b(?:html|web ?page)\b/giu],
  ['MD', /\b(?:markdown|md)\b/giu],
];

/** "as a pdf", "to Excel", "into slides": the format the user wants, when several are named. */
export const FILE_FORMAT_TARGET_PREFIX = /\b(?:as|to|into|in)\s+(?:an?\s+)?$/iu;

export const DEFAULT_FILE_FORMAT = 'TXT';

/** Fenced as one block from the first line to the last, and nothing else. */
export const WHOLE_CODE_FENCE = /^```[\w+#.-]*\n([\s\S]*?)\n?```$/u;

export const FILE_WRITER_BASE_PROMPT =
  'You write the content of a {FORMAT} file the user asked for. Output only what goes inside the file: no preamble, no explanation, no "here is your file".';

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
  PPTX: 'Write Markdown: a # title first, then one ## heading per slide with at most 6 short bullets each. A table or code block gets its own slide.',
  XLSX: 'Write the data as Markdown tables. Put a ## heading naming each sheet directly above its table. Keep number cells plain: no thousands separators or currency symbols.',
  CSV: 'Output CSV only: a header row, then data rows, comma-separated, quoted where needed. No Markdown.',
  JSON: 'Output one valid JSON value only. No Markdown fences.',
  TXT: 'Output plain text without Markdown syntax.',
  ZIP: "Write Markdown. Put each file in its own fenced code block with a language, and write the file's relative path alone on the line directly above its block (for example `src/index.ts`). Tables become CSV files.",
};
