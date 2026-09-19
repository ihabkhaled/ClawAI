/**
 * A generated file's bytes live one hour, then a sweep deletes them. The row
 * and the text it was built from stay, so the chat can rebuild it for free
 * (same content) or ask the AI again (F1, ADR-104).
 */
export const FILE_ASSET_TTL_MS = 60 * 60 * 1000;

/** How often expired bytes are swept. */
export const FILE_ASSET_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/** At most this many assets per sweep, so one sweep never runs long. */
export const FILE_ASSET_SWEEP_BATCH = 100;

/** Characters kept in a download filename; everything else becomes "-". */
export const SAFE_FILENAME_PATTERN = /[^A-Za-z0-9._ -]/gu;

export const MAX_DOWNLOAD_FILENAME_LENGTH = 120;

/** Largest answer that can be exported as a file (F2). */
export const EXPORT_MAX_CONTENT_CHARS = 200_000;

/**
 * A file request's prompt is the user's whole chat message, so this must be at
 * least chat-service's message limit (create-message.dto.ts, 100k). It was
 * 4,000: every longer file request failed after the model had already run.
 */
export const GENERATE_MAX_PROMPT_CHARS = 100_000;

/** Model-written file content. A file writer answers in at most 32k tokens. */
export const GENERATE_MAX_CONTENT_CHARS = 1_000_000;

/** Marks a generation that is an export of existing text, not an AI call. */
export const EXPORT_PROVIDER = 'EXPORT';
export const EXPORT_MODEL = 'none';
export const EXPORT_PROMPT = 'Export of a chat answer';

/** A name the service made up (`generated-<ms>.<ext>`), which is no title. */
export const GENERATED_FILENAME_PATTERN = /^generated-\d+\.?[A-Za-z0-9]*$/u;

/** A generated file's title, description and name are clipped to these (F3c, ADR-109). */
export const FILE_TITLE_MAX_CHARS = 120;
export const FILE_DESCRIPTION_MAX_CHARS = 240;
export const FILENAME_BASE_MAX_CHARS = 80;
/** A title taken from the request keeps at most this many words. */
export const PROMPT_TITLE_MAX_WORDS = 8;
export const DEFAULT_FILE_TITLE = 'Document';
export const DEFAULT_FILENAME_BASE = 'claw-file';

/** Formats whose content is Markdown, so a heading can name the file. */
export const MARKDOWN_CONTENT_FORMATS: readonly string[] = [
  'PDF',
  'DOCX',
  'HTML',
  'MD',
  'XLSX',
  'PPTX',
  'ZIP',
];

/** Words a request opens with that say nothing about the file ("make me an Excel …"). */
export const REQUEST_FILLER_WORDS: readonly string[] = [
  'a',
  'an',
  'the',
  'me',
  'us',
  'my',
  'please',
  'can',
  'could',
  'you',
  'i',
  'want',
  'need',
  'would',
  'like',
  'make',
  'create',
  'generate',
  'write',
  'give',
  'build',
  'produce',
  'prepare',
  'draft',
  'export',
  'save',
  'download',
  'file',
  'document',
  'doc',
  'pdf',
  'docx',
  'word',
  'excel',
  'xlsx',
  'spreadsheet',
  'sheet',
  'powerpoint',
  'pptx',
  'slides',
  'slide',
  'deck',
  'presentation',
  'csv',
  'json',
  'html',
  'markdown',
  'md',
  'txt',
  'text',
  'zip',
  'archive',
  'of',
  'for',
  'about',
  'on',
  'with',
  'as',
  'to',
  'into',
  'in',
  'that',
];

/** Characters no file system accepts in a name; control characters go too. */
export const UNSAFE_FILENAME_CHARS = new RegExp(
  `[\\\\/:*?"<>|${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`,
  'gu',
);

/** Control characters, dropped from titles and descriptions. */
export const CONTROL_CHARS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`,
  'gu',
);

/** A file extension a model may leave on a title ("Plan.pdf"). */
export const TITLE_FILE_EXTENSION = /\.(?:pdf|docx?|xlsx?|pptx?|csv|json|html?|md|txt|zip)$/iu;
