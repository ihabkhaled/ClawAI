/**
 * Largest base64 reference image the service accepts, from chat or from
 * file-service on a retry: 25 MB of bytes, base64-expanded, plus padding.
 * One number for both doors, so a retry cannot fetch what a send would refuse.
 */
export const IMAGE_REFERENCE_MAX_BASE64_LENGTH = Math.ceil((25 * 1024 * 1024 * 4) / 3) + 4;

/** A file-service id, as chat-service sends it and as it is stored. */
export const IMAGE_REFERENCE_FILE_ID_MAX_LENGTH = 100;

/** Timeout for reading a stored reference back from file-service on a retry. */
export const IMAGE_REFERENCE_FETCH_TIMEOUT_MS = 30_000;

/** Path of file-service's owner-checked internal content read. */
export const IMAGE_REFERENCE_CONTENT_PATH = '/api/v1/internal/files';
