import { type TokenUsage } from '@claw/shared-types';

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
  isAutoMode?: boolean;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
};

/**
 * What `ImageExecutionManager.execute` needs for ONE attempt.
 *
 * Deliberately separate from `GenerateImageParams`, which is the shape a caller
 * ENQUEUES with. `requestId` cannot live on that shape: it identifies a single
 * paid attempt, and the same enqueued row is executed again by
 * `POST /images/:id/retry`.
 */
export type ExecuteImageInput = {
  prompt: string;
  provider: string;
  model: string;
  userId: string;
  /**
   * Idempotency key for the PAYG hold — one per PAID ATTEMPT.
   *
   * `reserve` is idempotent on `(userId, requestId)`, so reusing the generation
   * row id would make a retry settle a second real provider call against the
   * first attempt's hold and bill two calls as one. Required rather than
   * optional so a new call site cannot reach a paid provider without one.
   */
  requestId: string;
  width?: number;
  height?: number;
  quality?: string;
  style?: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
};

export type ImageProviderResponse = {
  imageUrl?: string;
  imageBase64?: string;
  revisedPrompt?: string;
  mimeType: string;
  width?: number;
  height?: number;
  /**
   * Measured token usage, when the provider reports any.
   *
   * Present for Gemini, which answers `:generateContent` with a `usageMetadata`
   * block exactly like a text call. ABSENT for OpenAI images: the
   * `/images/generations` response carries `created` and `data` and nothing
   * else — there is genuinely no usage to read, which is why images are priced
   * per unit rather than per token. See `IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS`.
   */
  usage?: TokenUsage;
};

export type GenerateImageResult = {
  fileId: string;
  revisedPrompt: string | null;
  latencyMs: number;
};

/**
 * What a failed generation stores and streams, once the cause has been told
 * apart from a plain provider error.
 */
export type ImageFailureDescription = {
  errorCode: string;
  errorMessage: string;
  /** Credit refused it. More attempts on PAID providers would be refused too. */
  isCreditFailure: boolean;
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
