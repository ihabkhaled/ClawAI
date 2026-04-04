import { type File, type FileChunk, type FileIngestionStatus } from "../../../generated/prisma";

export interface CreateFileInput {
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}

export interface UpdateFileIngestionInput {
  ingestionStatus: FileIngestionStatus;
}

export interface FileFilters {
  userId: string;
  ingestionStatus?: FileIngestionStatus;
}

export type FileWithChunks = File & {
  chunks: FileChunk[];
};

export interface CreateFileChunkInput {
  fileId: string;
  chunkIndex: number;
  content: string;
}
