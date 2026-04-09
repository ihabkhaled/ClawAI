import { type FileFormat, type FileGenerationStatus } from '../../../generated/prisma';

export type FileGenerationRecord = {
  id: string;
  userId: string;
  threadId: string | null;
  userMessageId: string | null;
  assistantMessageId: string | null;
  prompt: string;
  content: string | null;
  format: FileFormat;
  filename: string | null;
  provider: string;
  model: string;
  status: FileGenerationStatus;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  latencyMs: number | null;
  createdAt: Date;
  updatedAt: Date;
  assets: FileGenerationAssetRecord[];
};

export type FileGenerationAssetRecord = {
  id: string;
  generationId: string;
  storageKey: string;
  url: string;
  downloadUrl: string;
  mimeType: string;
  sizeBytes: number | null;
  createdAt: Date;
};

export type GenerateFileParams = {
  prompt: string;
  content: string;
  format: string;
  provider: string;
  model: string;
  userId: string;
  threadId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  filename?: string;
};

export type StoreFileResponse = {
  fileId: string;
};

export type FileGenerationEventPayload = {
  generationId: string;
  status: string;
  provider?: string;
  model?: string;
  format?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  assets?: Array<{
    id: string;
    url: string;
    downloadUrl: string;
    mimeType: string;
    sizeBytes: number | null;
  }>;
};

export const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'] as const;
