import { type File, type FileChunk, type FileIngestionStatus } from '../../../generated/prisma';

export interface CreateFileData {
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  content?: string | null;
  // Slice C foundation 3 — file retention sweeper.
  // When non-null, the retention sweeper will delete this file's row + on-disk
  // contents once the configured retention window elapses. null/undefined = keep forever.
  retentionExpiresAt?: Date | null;
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

export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/mov',
  'video/webm',
  'video/x-msvideo',
  'video/avi',
  'video/mpeg',
] as const;

export const ALLOWED_MIME_TYPES = [
  // Text & documents
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  'text/xml',
  'text/css',
  'text/javascript',
  'text/x-python',
  'text/x-java-source',
  'text/x-c',
  'text/x-c++',
  'text/x-go',
  'text/x-rust',
  'text/x-ruby',
  'text/x-shellscript',
  'text/x-yaml',
  'text/x-toml',
  'text/x-sql',
  'text/x-diff',
  'text/x-log',
  'text/rtf',
  'text/tab-separated-values',
  // Structured data
  'application/json',
  'application/xml',
  'application/javascript',
  'application/typescript',
  'application/x-yaml',
  'application/yaml',
  'application/toml',
  'application/sql',
  'application/graphql',
  'application/ld+json',
  'application/x-ndjson',
  // Documents (binary, need text extraction)
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/rtf',
  // Code & config (often sent as octet-stream)
  'application/octet-stream',
  'application/x-sh',
  'application/x-python',
  'application/x-httpd-php',
  'application/x-ruby',
  'application/x-perl',
  'application/x-latex',
  'application/x-tex',
  // Images
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  ...VIDEO_MIME_TYPES,
  // Archives (expanded server-side via ZipExpansionManager — Slice C backend 2)
  'application/zip',
  'application/x-zip-compressed',
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
