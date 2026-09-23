import type { FileIngestionStatus } from '@/enums';

import type { ArchiveExtractionSummary } from './archive.types';

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
  extractionMetadata?: ArchiveExtractionSummary | null;
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
