import { type File, type FileChunk, type FileIngestionStatus } from '../../../generated/prisma';

export interface CreateFileData {
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  content?: string | null;
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
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/pdf',
  'text/html',
  'text/xml',
  'application/xml',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
