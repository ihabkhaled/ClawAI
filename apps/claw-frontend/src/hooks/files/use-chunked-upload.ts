'use client';

import { useCallback, useRef, useState } from 'react';

import {
  CHUNKED_UPLOAD_CHUNK_BYTES,
  CHUNKED_UPLOAD_MAX_RETRIES_PER_CHUNK,
  CHUNKED_UPLOAD_THRESHOLD_BYTES,
  UPLOAD_PROGRESS_TICK_MS,
} from '@/constants/chunked-upload.constants';
import { filesRepository } from '@/repositories/files/files.repository';
import type { UseChunkedUploadParams, UseChunkedUploadReturn } from '@/types/upload-progress.types';
import {
  computeBackoffMs,
  computeChunkCount,
  computeChunkRange,
  computeUploadProgress,
  shouldChunkUpload,
  sleep,
} from '@/utilities/chunked-upload.utility';
import { readFileAsBase64 } from '@/utilities/file-read.utility';

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
    async (uploadId: string, index: number, base64: string): Promise<void> => {
      let lastError: unknown;
      for (let attempt = 1; attempt <= CHUNKED_UPLOAD_MAX_RETRIES_PER_CHUNK; attempt += 1) {
        try {
          await filesRepository.uploadChunk(uploadId, index, base64);
          return;
        } catch (attemptError) {
          lastError = attemptError;
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
    async (file: File): Promise<string> => {
      const totalChunks = computeChunkCount(file.size, CHUNKED_UPLOAD_CHUNK_BYTES);
      const key = `${file.name}:${String(file.size)}:${String(file.lastModified)}`;
      const startedAt = Date.now();

      let uploadId: string;
      let alreadyReceived = new Set<number>();
      const existing = sessionRef.current;
      if (existing !== null && existing.key === key) {
        // Resume: ask the server which chunks already landed rather than
        // re-sending everything after a dropped connection.
        const status = await filesRepository.getChunkedUploadStatus(existing.uploadId);
        uploadId = existing.uploadId;
        alreadyReceived = new Set(status.receivedChunks);
      } else {
        const session = await filesRepository.initChunkedUpload({
          filename: file.name,
          mimeType: file.type.length > 0 ? file.type : 'application/octet-stream',
          sizeBytes: file.size,
          totalChunks,
        });
        uploadId = session.uploadId;
        sessionRef.current = { key, uploadId, totalChunks };
      }

      let bytesUploaded = 0;
      for (let index = 0; index < totalChunks; index += 1) {
        const { start, end } = computeChunkRange(index, file.size, CHUNKED_UPLOAD_CHUNK_BYTES);
        if (alreadyReceived.has(index)) {
          bytesUploaded += end - start;
          emitProgress(bytesUploaded, file.size, startedAt);
          continue;
        }
        const blob = file.slice(start, end);
        const base64 = await readFileAsBase64(new File([blob], file.name));
        try {
          await uploadOneChunk(uploadId, index, base64);
        } catch (chunkError) {
          // The session survives on the server (TTL-bound); the next call for
          // this same File resumes from here instead of restarting.
          throw chunkError;
        }
        bytesUploaded += end - start;
        emitProgress(bytesUploaded, file.size, startedAt);
      }

      const uploaded = await filesRepository.completeChunkedUpload(uploadId);
      sessionRef.current = null;
      return uploaded.id;
    },
    [emitProgress, uploadOneChunk],
  );

  const uploadSingleShot = useCallback(
    async (file: File): Promise<string> => {
      const startedAt = Date.now();
      const content = await readFileAsBase64(file);
      const uploaded = await filesRepository.uploadFile({
        filename: file.name,
        mimeType: file.type.length > 0 ? file.type : 'application/octet-stream',
        sizeBytes: file.size,
        storagePath: `/uploads/${file.name}`,
        content,
      });
      emitProgress(file.size, file.size, startedAt);
      return uploaded.id;
    },
    [emitProgress],
  );

  const upload = useCallback(
    async (file: File): Promise<string> => {
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
          ? await uploadChunked(file)
          : await uploadSingleShot(file);
        return fileId;
      } catch (uploadError) {
        const normalized = uploadError instanceof Error ? uploadError : new Error('Upload failed');
        setError(normalized);
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
