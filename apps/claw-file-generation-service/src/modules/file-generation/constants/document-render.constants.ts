/**
 * How answers are rendered into documents (F3, ADR-107).
 */

/** Links keep their target only for these schemes; anything else stays plain text. */
export const ALLOWED_LINK_PROTOCOLS: readonly string[] = ['http:', 'https:', 'mailto:'];

/** A fenced code block's language, as passed to a highlighter. */
export const CODE_LANGUAGE_PATTERN = /^[A-Za-z0-9+#.-]{1,24}$/u;

/** Letters of right-to-left scripts: Hebrew, Arabic, Syriac, Thaana and their forms. */
export const RTL_LETTER = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;

/** Any other letter. The first strong letter decides a paragraph's direction. */
export const LTR_LETTER = /\p{L}/u;

export const MAX_HEADING_LEVEL = 6;

/** Title used when the answer has no heading and the caller gave none. */
export const DEFAULT_DOCUMENT_TITLE = 'Document';

/**
 * Body fonts, in fallback order. The Noto families ship in the service image
 * (fonts-noto-core, fonts-noto-cjk) and cover all 13 app locales. The Windows
 * families let the same renderer run in local tests.
 */
export const DOCUMENT_BODY_FONTS: readonly string[] = [
  'Noto Sans',
  'Noto Sans Arabic',
  'Noto Sans Hebrew',
  'Noto Sans Devanagari',
  'Noto Sans Thai',
  'Noto Sans CJK SC',
  'Noto Sans CJK JP',
  'Segoe UI',
  'Arial',
  'Nirmala UI',
  'Leelawadee UI',
  'Microsoft YaHei',
  'Yu Gothic',
];

export const DOCUMENT_MONO_FONTS: readonly string[] = [
  'DejaVu Sans Mono',
  'Noto Sans Mono',
  'Consolas',
];

/** Directories searched for fonts; missing ones are skipped. */
export const TYPST_FONT_DIRECTORIES: readonly string[] = ['/usr/share/fonts', 'C:/Windows/Fonts'];

/** Word's fonts. Word shapes and orders RTL text itself. */
export const DOCX_BODY_FONT = 'Calibri';
export const DOCX_MONO_FONT = 'Consolas';
export const DOCX_CODE_SHADING = 'F2F2F2';
export const DOCX_TABLE_HEADER_SHADING = 'E7E6E6';
/** Half-points: 22 = 11 pt. */
export const DOCX_BODY_SIZE = 22;
export const DOCX_NUMBERING_REFERENCE = 'claw-numbered';

/**
 * A spreadsheet cell starting with one of these is read as a formula by Excel,
 * LibreOffice and Sheets when a CSV is opened (CSV/formula injection), so a
 * text cell gets a leading apostrophe. Plain numbers such as "-5" are exempt.
 */
export const FORMULA_TRIGGER = /^[=+\-@\t\r]/u;
export const PLAIN_NUMBER = /^-?(?:0|[1-9]\d{0,14})(?:\.\d{1,15})?$/u;

/** Excel refuses these in sheet names, and names longer than 31 characters. */
export const XLSX_SHEET_NAME_FORBIDDEN = /[[\]:*?/\\]/gu;
export const XLSX_MAX_SHEET_NAME = 31;
export const XLSX_MAX_SHEETS = 50;
/** Column width in characters, bounded so one long cell cannot hide the rest. */
export const XLSX_MIN_COLUMN_WIDTH = 8;
export const XLSX_MAX_COLUMN_WIDTH = 60;
/** XML 1.0 forbids these control characters; they are dropped. */
export const XML_INVALID_CHARS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(8)}${String.fromCharCode(11)}${String.fromCharCode(12)}${String.fromCharCode(14)}-${String.fromCharCode(31)}\\uFFFE\\uFFFF]`,
  'gu',
);

/** A slide shows at most this many paragraphs before continuing on the next. */
export const PPTX_MAX_LINES_PER_SLIDE = 9;
export const PPTX_TITLE_FONT = 'Calibri';
export const PPTX_MONO_FONT = 'Consolas';

/** Files a zip bundle may hold, so one answer cannot produce thousands. */
export const ZIP_MAX_FILES = 50;
/**
 * A filename named in the line just before a code block ("`src/app.ts`",
 * "File: main.py").
 */
export const ZIP_FILENAME_HINT = /([\w.-]+\/){0,4}[\w-][\w.-]{0,80}\.[A-Za-z0-9]{1,8}/u;
export const ZIP_MAX_HINT_LENGTH = 120;

/** File extension for a fenced code block's language. */
export const CODE_LANGUAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  bash: 'sh',
  c: 'c',
  cpp: 'cpp',
  cs: 'cs',
  csharp: 'cs',
  css: 'css',
  csv: 'csv',
  dart: 'dart',
  dockerfile: 'Dockerfile',
  go: 'go',
  golang: 'go',
  h: 'h',
  html: 'html',
  java: 'java',
  javascript: 'js',
  js: 'js',
  json: 'json',
  jsx: 'jsx',
  kotlin: 'kt',
  kt: 'kt',
  markdown: 'md',
  md: 'md',
  php: 'php',
  powershell: 'ps1',
  ps1: 'ps1',
  py: 'py',
  python: 'py',
  r: 'r',
  rb: 'rb',
  ruby: 'rb',
  rs: 'rs',
  rust: 'rs',
  scala: 'scala',
  sh: 'sh',
  shell: 'sh',
  sql: 'sql',
  swift: 'swift',
  ts: 'ts',
  tsx: 'tsx',
  typescript: 'ts',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yml',
  zsh: 'sh',
};
