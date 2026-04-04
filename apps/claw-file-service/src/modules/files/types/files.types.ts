import { type File, type FileChunk, type FileIngestionStatus } from "../../../generated/prisma";

export interface CreateFileData {
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}

export interface FileFilters {
  userId: string;
  ingestionStatus?: FileIngestionStatus;
  search?: string;
}

export interface ChunkData {
  fileId: string;
  chunkIndex: number;
  content: string;
}

export type FileWithChunks = File & {
  chunks: FileChunk[];
};

export const ALLOWED_MIME_TYPES = [
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/pdf",
  "text/html",
  "text/xml",
  "application/xml",
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
