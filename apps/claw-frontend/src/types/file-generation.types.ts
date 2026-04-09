import type { FileGenerationStatus } from '@/enums';

export type FileGenerationAsset = {
  id: string;
  url: string;
  downloadUrl: string;
  mimeType: string;
  sizeBytes: number | null;
};

export type FileGeneration = {
  id: string;
  status: FileGenerationStatus;
  provider: string;
  model: string;
  prompt: string;
  format: string;
  filename: string | null;
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
