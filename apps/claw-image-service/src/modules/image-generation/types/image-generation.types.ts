import { type ImageGenerationStatus } from '../../../generated/prisma';

export type ImageGenerationRecord = {
  id: string;
  userId: string;
  threadId: string | null;
  userMessageId: string | null;
  assistantMessageId: string | null;
  prompt: string;
  revisedPrompt: string | null;
  provider: string;
  model: string;
  width: number;
  height: number;
  quality: string | null;
  style: string | null;
  status: ImageGenerationStatus;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  latencyMs: number | null;
  createdAt: Date;
  updatedAt: Date;
  assets: ImageGenerationAssetRecord[];
};

export type ImageGenerationAssetRecord = {
  id: string;
  generationId: string;
  storageKey: string;
  url: string;
  downloadUrl: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  createdAt: Date;
};

export type GenerateImageParams = {
  prompt: string;
  provider: string;
  model: string;
  userId: string;
  threadId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  width?: number;
  height?: number;
  quality?: string;
  style?: string;
};

export type ImageProviderResponse = {
  imageUrl?: string;
  imageBase64?: string;
  revisedPrompt?: string;
  mimeType: string;
  width?: number;
  height?: number;
};

export type GenerateImageResult = {
  fileId: string;
  revisedPrompt: string | null;
  latencyMs: number;
};

export type ConnectorConfigResponse = {
  provider: string;
  apiKey: string;
  baseUrl?: string;
};

export type StoreImageResponse = {
  fileId: string;
};

export type ImageGenerationEventPayload = {
  generationId: string;
  status: string;
  provider?: string;
  model?: string;
  progress?: number;
  assets?: Array<{
    id: string;
    url: string;
    downloadUrl: string;
    mimeType: string;
    width: number | null;
    height: number | null;
    sizeBytes: number | null;
  }>;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'] as const;
