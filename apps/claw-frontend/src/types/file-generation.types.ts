import type { FileGenerationStatus } from '@/enums';

export type FileGenerationAsset = {
  id: string;
  url: string;
  downloadUrl: string;
  mimeType: string;
  sizeBytes: number | null;
  /** The bytes are deleted after this (1 hour); the chat can rebuild them. */
  expiresAt?: string | null;
  expiredAt?: string | null;
  createdAt?: string;
};

export type FileGeneration = {
  id: string;
  status: FileGenerationStatus;
  provider: string;
  model: string;
  prompt: string;
  format: string;
  filename: string | null;
  /** The AI's own title and first sentence (ADR-109); absent on older files. */
  title?: string | null;
  description?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  assets: FileGenerationAsset[];
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FileGenerationEventPayload = {
  generationId: string;
  status: FileGenerationStatus;
  provider?: string;
  model?: string;
  format?: string;
  assets?: FileGenerationAsset[];
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type UseFileDownloadResult = {
  download: (path: string, filename: string) => Promise<void>;
  isDownloading: boolean;
  failed: boolean;
};

export type UseFileGenerationBubbleResult = {
  generation: FileGeneration | null;
  asset: FileGenerationAsset | undefined;
  expired: boolean;
  minutesLeft: number | null;
  isRebuilding: boolean;
  isDownloading: boolean;
  downloadFailed: boolean;
  download: () => void;
  rebuild: () => void;
};
