import type { ImageGenerationStatus } from '@/enums';

export type ImageGenerationAsset = {
  id: string;
  url: string;
  downloadUrl: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
};

export type ImageGeneration = {
  id: string;
  status: ImageGenerationStatus;
  provider: string;
  model: string;
  prompt: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  assets: ImageGenerationAsset[];
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ImageGenerationEventPayload = {
  generationId: string;
  status: ImageGenerationStatus;
  provider?: string;
  model?: string;
  progress?: number;
  assets?: ImageGenerationAsset[];
  errorCode?: string | null;
  errorMessage?: string | null;
};
