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
