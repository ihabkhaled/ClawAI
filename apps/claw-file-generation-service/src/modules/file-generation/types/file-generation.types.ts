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
  title: string | null;
  description: string | null;
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
  expiresAt: Date | null;
  expiredAt: Date | null;
  createdAt: Date;
};

/** What a download needs to send: the bytes and how to name them. */
export type FileAssetDownload = {
  stream: NodeJS.ReadableStream;
  mimeType: string;
  /** ASCII-only, for the plain `filename=` parameter. */
  filename: string;
  /** The real name in any script, for `filename*=` (RFC 5987). */
  unicodeFilename: string;
  sizeBytes: number | null;
};

export type AssetExpiryFields = Pick<FileGenerationAssetRecord, 'expiresAt' | 'expiredAt'>;

export type GenerateFileParams = {
  prompt: string;
  content: string;
  format: FileFormat;
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

/** An asset as a user sees it: no storage key, so no file-service id leaks. */
export type FileGenerationAssetView = Omit<FileGenerationAssetRecord, 'storageKey'>;

/** A generation as a user sees it. */
export type FileGenerationView = Omit<FileGenerationRecord, 'assets'> & {
  assets: FileGenerationAssetView[];
};

/** What a generated file is called and what it holds (F3c, ADR-109). */
export type FileIdentity = { title: string; description: string | null; filenameBase: string };
