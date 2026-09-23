// Chunked upload — session bounds.
//
// A recording or any large attachment above CHUNKED_UPLOAD_THRESHOLD_BYTES is
// sent as a sequence of chunks instead of one JSON body, so a transient
// network failure loses one chunk (retried) instead of the whole upload
// (restarted from zero). See ChunkedUploadManager for the on-disk session
// format and FilesController for the four endpoints (init/chunk/status/complete).

/** Files at or below this size still use the single-shot /files/upload path. */
export const CHUNKED_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024; // 4MB

/** Per-chunk ceiling. Keeps each request body small regardless of client chunk size. */
export const CHUNKED_UPLOAD_MAX_CHUNK_BYTES = 8 * 1024 * 1024; // 8MB

/** A session cannot declare more chunks than this — bounds directory listing cost. */
export const CHUNKED_UPLOAD_MAX_CHUNKS = 2000;

/** Abandoned sessions (tab closed mid-upload) are purged after this age. */
export const CHUNKED_UPLOAD_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** Subdirectory of FILE_STORAGE_PATH that holds in-progress chunk sessions. */
export const CHUNKED_UPLOAD_SESSION_DIR = '.chunk-sessions';

/** uploadId shape emitted by init and required by every other endpoint. */
export const CHUNKED_UPLOAD_ID_PATTERN = /^[a-f0-9-]{36}$/;
