import type { VideoProcessingFailureReason } from '@claw/shared-types';

import type { FileIngestionStatus } from '@/enums';

import type { ArchiveExtractionSummary } from './archive.types';

/**
 * The owner-facing slice of file-service's `extractionMetadata.media` for a
 * processed video (VideoMediaMetadata there). GET /files/:id returns the whole
 * row to its owner; only what the chat UI reads is typed here. The thumbnail
 * is ≤ 480 px / ≤ 96 KB, written once by the video pipeline.
 */
export type VideoMediaSummary = {
  durationMs?: number;
  thumbnailBase64?: string | null;
  thumbnailMimeType?: string | null;
  /** Why processing ended FAILED; `PROCESSING_CANCELLED` when the owner stopped it. */
  failureReason?: VideoProcessingFailureReason | null;
};

export type FileExtractionMetadata = ArchiveExtractionSummary & {
  media?: VideoMediaSummary | null;
};

export type UploadedFile = {
  id: string;
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  ingestionStatus: FileIngestionStatus;
  parentFileId?: string | null;
  isExtracted?: boolean;
  /** Path inside the parent archive, for a file extracted from one. */
  archivePath?: string | null;
  /** Files extracted from this one. Above 0 means it is an expanded archive. */
  childCount?: number;
  /** `CODE: reason` when extraction failed or skipped part of an archive. */
  extractionError?: string | null;
  extractionMetadata?: FileExtractionMetadata | null;
  createdAt: string;
  updatedAt: string;
  retentionExpiresAt?: string | null;
};

export type FileChunk = {
  id: string;
  fileId: string;
  chunkIndex: number;
  content: string;
  createdAt: string;
};

export type FileWithChunks = UploadedFile & {
  chunks: FileChunk[];
};

export type UploadFileRequest = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  content?: string;
};

/** Response shape shared by every chunked-upload endpoint (init/chunk/status). */
export type ChunkedUploadStatus = {
  uploadId: string;
  totalChunks: number;
  receivedChunks: number[];
  complete: boolean;
};

export type InitChunkedUploadRequest = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  totalChunks: number;
};

/** `POST /files/:id/processing/cancel` answer (file-service, pack §72). */
export type FileProcessingCancelResult = {
  fileId: string;
  /** The owner-facing effective status after the call (FAILED once cancelled). */
  ingestionStatus: FileIngestionStatus;
  /** False when there was nothing to stop. */
  cancelled: boolean;
};
