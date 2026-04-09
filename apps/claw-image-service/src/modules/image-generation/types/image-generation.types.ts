import { type ImageGenerationStatus } from '../../../generated/prisma';

export type ImageGenerationRecord = {
  id: string;
  userId: string;
  threadId: string | null;
  messageId: string | null;
  prompt: string;
  revisedPrompt: string | null;
  provider: string;
  model: string;
  width: number;
  height: number;
  quality: string | null;
  style: string | null;
  fileId: string | null;
  status: ImageGenerationStatus;
  errorMessage: string | null;
  latencyMs: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type GenerateImageParams = {
  prompt: string;
  provider: string;
  model: string;
  userId: string;
  threadId?: string;
  messageId?: string;
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
