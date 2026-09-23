import {
  CHUNKED_UPLOAD_CHUNK_BYTES,
  CHUNKED_UPLOAD_RETRY_BASE_MS,
  CHUNKED_UPLOAD_RETRY_MAX_MS,
} from '@/constants/chunked-upload.constants';
import type { UploadProgressSnapshot } from '@/types/upload-progress.types';

/** Promise-based delay, for the bounded backoff between chunk retry attempts. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Whether a file should go through the chunked path rather than one JSON POST. */
export function shouldChunkUpload(sizeBytes: number, thresholdBytes: number): boolean {
  return sizeBytes > thresholdBytes;
}

/** How many chunks a file of this size splits into, at CHUNKED_UPLOAD_CHUNK_BYTES each. */
export function computeChunkCount(
  sizeBytes: number,
  chunkBytes: number = CHUNKED_UPLOAD_CHUNK_BYTES,
): number {
  return Math.max(1, Math.ceil(sizeBytes / chunkBytes));
}

/** `[start, end)` byte range for chunk `index` of a file this size. */
export function computeChunkRange(
  index: number,
  sizeBytes: number,
  chunkBytes: number = CHUNKED_UPLOAD_CHUNK_BYTES,
): { start: number; end: number } {
  const start = index * chunkBytes;
  const end = Math.min(start + chunkBytes, sizeBytes);
  return { start, end };
}

/**
 * Exponential backoff, capped: attempt 1 waits BASE_MS, attempt 2 waits
 * 2×BASE_MS, and so on up to CHUNKED_UPLOAD_RETRY_MAX_MS. Bounded by
 * CHUNKED_UPLOAD_MAX_RETRIES_PER_CHUNK in the caller — this never retries
 * forever (see "No Infinite Polling").
 */
export function computeBackoffMs(
  attempt: number,
  baseMs: number = CHUNKED_UPLOAD_RETRY_BASE_MS,
  maxMs: number = CHUNKED_UPLOAD_RETRY_MAX_MS,
): number {
  const delay = baseMs * 2 ** Math.max(0, attempt - 1);
  return Math.min(delay, maxMs);
}

/**
 * Percent / speed / ETA from raw byte + time counters. Pure so it is testable
 * with fake timers and reusable by every upload surface (recorder, paperclip,
 * drag-drop) instead of each computing its own.
 */
export function computeUploadProgress(args: {
  bytesUploaded: number;
  totalBytes: number;
  elapsedMs: number;
}): UploadProgressSnapshot {
  const { bytesUploaded, totalBytes, elapsedMs } = args;
  const clampedBytes = Math.min(Math.max(0, bytesUploaded), Math.max(totalBytes, 0));
  const percent = totalBytes > 0 ? Math.min(100, Math.round((clampedBytes / totalBytes) * 100)) : 0;
  const elapsedSeconds = elapsedMs / 1000;
  const bytesPerSecond = elapsedSeconds > 0 ? clampedBytes / elapsedSeconds : 0;
  const remainingBytes = Math.max(0, totalBytes - clampedBytes);
  const etaSeconds = bytesPerSecond > 0 ? remainingBytes / bytesPerSecond : null;

  return {
    percent,
    bytesUploaded: clampedBytes,
    totalBytes,
    bytesPerSecond,
    etaSeconds,
    elapsedSeconds,
  };
}

/** `1.2 MB/s`, `340 KB/s` — for the upload-progress readout's speed line. */
export function formatUploadSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond >= 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  if (bytesPerSecond >= 1024) {
    return `${(bytesPerSecond / 1024).toFixed(0)} KB/s`;
  }
  return `${Math.round(bytesPerSecond)} B/s`;
}

/** `m:ss` for a duration in seconds — the same shape as formatRecordingElapsed. */
export function formatUploadDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes)}:${seconds.toString().padStart(2, '0')}`;
}
