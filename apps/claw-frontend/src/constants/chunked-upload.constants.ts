// Client-side chunked upload — mirrors apps/claw-file-service's
// chunked-upload.constants.ts bounds. A file at or below the threshold still
// uses the single-shot /files/upload request; above it, use-chunked-upload
// splits it and uploads chunk by chunk with bounded retry + resume.

/** Files at or below this size use the existing single-shot upload. */
export const CHUNKED_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024; // 4MB

/** Size of each chunk sent to the server. Stays under the server's 8MB cap. */
export const CHUNKED_UPLOAD_CHUNK_BYTES = 2 * 1024 * 1024; // 2MB

/** Bounded retry — see "No Infinite Polling": every retry loop has a ceiling. */
export const CHUNKED_UPLOAD_MAX_RETRIES_PER_CHUNK = 4;

/** Exponential backoff base; attempt N waits BASE_MS * 2^(N-1), capped below. */
export const CHUNKED_UPLOAD_RETRY_BASE_MS = 500;
export const CHUNKED_UPLOAD_RETRY_MAX_MS = 8000;

/** How often the progress readout (percent/ETA/speed) recomputes. */
export const UPLOAD_PROGRESS_TICK_MS = 1000;
