'use client';

import { useCallback, useRef, useState } from 'react';

import {
  CHUNKED_UPLOAD_CHUNK_BYTES,
  CHUNKED_UPLOAD_MAX_RETRIES_PER_CHUNK,
  CHUNKED_UPLOAD_THRESHOLD_BYTES,
  UPLOAD_PROGRESS_TICK_MS,
} from '@/constants/chunked-upload.constants';
import { filesRepository } from '@/repositories/files/files.repository';
import type {
  ChunkedUploadCallOptions,
  UseChunkedUploadParams,
  UseChunkedUploadReturn,
} from '@/types/upload-progress.types';
import {
  computeBackoffMs,
  computeChunkCount,
  computeChunkRange,
  computeUploadProgress,
  shouldChunkUpload,
  sleep,
  throwIfUploadAborted,
} from '@/utilities/chunked-upload.utility';
import { readFileAsBase64 } from '@/utilities/file-read.utility';
import { logger } from '@/utilities/logger.utility';

/**
 * Uploads a `File` through the same secure pipeline every attachment uses,
 * chunked (with bounded per-chunk retry + resume) once it is above
 * CHUNKED_UPLOAD_THRESHOLD_BYTES. This is the fix for "5-second video recording
 * -> network error on send": before this hook, a dropped connection restarted
 * the whole upload from zero; now only the one chunk in flight is retried, and
 * a retained session lets a second `upload()` call for the SAME file resume
 * instead of re-uploading chunks the server already has.
 *
 * A file at or below the threshold still goes through the original single-shot
 * `/files/upload` request — chunking a 50KB image would be pure overhead.
 *
 * `options.signal` is the user taking the file back mid-upload (removing its
 * tile). Every request carries it, the chunk loop and the retry loop check it
 * before each request, and an aborted chunked upload DELETEs its server
 * session once (best effort — the server's TTL sweep is the backstop), so the
 * temp chunks are freed now rather than when the session expires.
 */
export function useChunkedUpload({
  onProgress,
}: UseChunkedUploadParams = {}): UseChunkedUploadReturn {
  const [progress, setProgress] = useState<UseChunkedUploadReturn['progress']>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Keyed by (name+size+lastModified) so a retried upload() call for the SAME
  // file resumes the SAME session instead of opening a new one and re-sending
  // chunks the server already has.
  const sessionRef = useRef<{ key: string; uploadId: string; totalChunks: number } | null>(null);

  const emitProgress = useCallback(
    (bytesUploaded: number, totalBytes: number, startedAt: number): void => {
      const snapshot = computeUploadProgress({
        bytesUploaded,
        totalBytes,
        elapsedMs: Date.now() - startedAt,
      });
      setProgress(snapshot);
      onProgress?.(snapshot);
    },
    [onProgress],
  );

  const uploadOneChunk = useCallback(
    async (
      uploadId: string,
      index: number,
      base64: string,
      signal: AbortSignal | undefined,
    ): Promise<void> => {
      let lastError: unknown;
      for (let attempt = 1; attempt <= CHUNKED_UPLOAD_MAX_RETRIES_PER_CHUNK; attempt += 1) {
        throwIfUploadAborted(signal);
        try {
          await filesRepository.uploadChunk(uploadId, index, base64, signal);
          return;
        } catch (attemptError) {
          lastError = attemptError;
          // An aborted request is not a flaky network: no retry, no backoff.
          throwIfUploadAborted(signal);
          if (attempt < CHUNKED_UPLOAD_MAX_RETRIES_PER_CHUNK) {
            await sleep(computeBackoffMs(attempt));
          }
        }
      }
      throw lastError instanceof Error ? lastError : new Error('Chunk upload failed');
    },
    [],
  );

  const uploadChunked = useCallback(
    async (file: File, signal: AbortSignal | undefined): Promise<string> => {
      const totalChunks = computeChunkCount(file.size, CHUNKED_UPLOAD_CHUNK_BYTES);
      const key = `${file.name}:${String(file.size)}:${String(file.lastModified)}`;
      const startedAt = Date.now();
      let uploadId: string | null = null;

      try {
        let alreadyReceived = new Set<number>();
        const existing = sessionRef.current;
        if (existing !== null && existing.key === key) {
          // Resume: ask the server which chunks already landed rather than
          // re-sending everything after a dropped connection.
          uploadId = existing.uploadId;
          const status = await filesRepository.getChunkedUploadStatus(existing.uploadId);
          alreadyReceived = new Set(status.receivedChunks);
        } else {
          const session = await filesRepository.initChunkedUpload(
            {
              filename: file.name,
              mimeType: file.type.length > 0 ? file.type : 'application/octet-stream',
              sizeBytes: file.size,
              totalChunks,
            },
            signal,
          );
          uploadId = session.uploadId;
          sessionRef.current = { key, uploadId, totalChunks };
        }

        let bytesUploaded = 0;
        for (let index = 0; index < totalChunks; index += 1) {
          throwIfUploadAborted(signal);
          const { start, end } = computeChunkRange(index, file.size, CHUNKED_UPLOAD_CHUNK_BYTES);
          if (alreadyReceived.has(index)) {
            bytesUploaded += end - start;
            emitProgress(bytesUploaded, file.size, startedAt);
            continue;
          }
          const blob = file.slice(start, end);
          const base64 = await readFileAsBase64(new File([blob], file.name));
          // A failure leaves the session on the server (TTL-bound); the next
          // call for this same File resumes from here instead of restarting.
          await uploadOneChunk(uploadId, index, base64, signal);
          bytesUploaded += end - start;
          emitProgress(bytesUploaded, file.size, startedAt);
        }

        // Past this point the file is being stored; an abort no longer applies.
        throwIfUploadAborted(signal);
        const uploaded = await filesRepository.completeChunkedUpload(uploadId);
        sessionRef.current = null;
        return uploaded.id;
      } catch (chunkedError) {
        if (signal?.aborted === true) {
          if (sessionRef.current?.key === key) {
            sessionRef.current = null;
          }
          if (uploadId !== null) {
            const abortedId = uploadId;
            // One DELETE, never retried: the server sweeps expired sessions anyway.
            filesRepository.abortChunkedUpload(abortedId).catch(() => {
              logger.warn({
                component: 'files',
                action: 'chunked-upload-abort-failed',
                message: 'Deleting an aborted upload session failed; the server TTL will free it',
                details: { uploadId: abortedId },
              });
            });
          }
        }
        throw chunkedError;
      }
    },
    [emitProgress, uploadOneChunk],
  );

  const uploadSingleShot = useCallback(
    async (file: File, signal: AbortSignal | undefined): Promise<string> => {
      const startedAt = Date.now();
      const content = await readFileAsBase64(file);
      throwIfUploadAborted(signal);
      const uploaded = await filesRepository.uploadFile(
        {
          filename: file.name,
          mimeType: file.type.length > 0 ? file.type : 'application/octet-stream',
          sizeBytes: file.size,
          storagePath: `/uploads/${file.name}`,
          content,
        },
        signal,
      );
      emitProgress(file.size, file.size, startedAt);
      return uploaded.id;
    },
    [emitProgress],
  );

  const upload = useCallback(
    async (file: File, options?: ChunkedUploadCallOptions): Promise<string> => {
      const signal = options?.signal;
      throwIfUploadAborted(signal);
      setIsUploading(true);
      setError(null);
      setProgress(computeUploadProgress({ bytesUploaded: 0, totalBytes: file.size, elapsedMs: 0 }));
      const tick = window.setInterval(() => {
        // Keeps the percent/ETA/speed readout moving at least once a second
        // even while a single large chunk is still in flight between the
        // per-chunk emitProgress calls above.
        setProgress((current) =>
          current === null
            ? current
            : computeUploadProgress({
                bytesUploaded: current.bytesUploaded,
                totalBytes: current.totalBytes,
                elapsedMs: current.elapsedSeconds * 1000 + UPLOAD_PROGRESS_TICK_MS,
              }),
        );
      }, UPLOAD_PROGRESS_TICK_MS);

      try {
        const fileId = shouldChunkUpload(file.size, CHUNKED_UPLOAD_THRESHOLD_BYTES)
          ? await uploadChunked(file, signal)
          : await uploadSingleShot(file, signal);
        return fileId;
      } catch (uploadError) {
        const normalized = uploadError instanceof Error ? uploadError : new Error('Upload failed');
        // Taking a file back is not a failure worth reporting.
        if (signal?.aborted !== true) {
          setError(normalized);
        }
        throw normalized;
      } finally {
        window.clearInterval(tick);
        setIsUploading(false);
        // Without this the last snapshot (100% / 0:00 remaining) sticks around
        // under the composer forever: `progress` is one piece of state shared
        // by every upload in the session, and nothing else ever nulls it out
        // once this upload settles, success or failure alike.
        setProgress(null);
      }
    },
    [uploadChunked, uploadSingleShot],
  );

  return { upload, progress, isUploading, error };
}
