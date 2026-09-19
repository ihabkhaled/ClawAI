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
