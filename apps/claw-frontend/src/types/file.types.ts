import type { FileIngestionStatus } from "@/enums";

export type UploadedFile = {
  id: string;
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  ingestionStatus: FileIngestionStatus;
  createdAt: string;
  updatedAt: string;
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
};
