import {
  type PaygFinalizeCalls,
  type PaygFinalizeUsage,
  type PaygHold,
} from '@claw/shared-entitlements';

import { type VideoAssetRole, type VideoGenerationStatus } from '../../../generated/prisma';
import { type VideoFailureCode } from '../../../common/enums';

export type VideoGenerationAssetRecord = {
  id: string;
  generationId: string;
  storageKey: string;
  url: string;
  downloadUrl: string;
  mimeType: string;
  sizeBytes: number | null;
  durationSeconds: number | null;
  role: VideoAssetRole;
};

export type VideoGenerationRecord = {
  id: string;
  userId: string;
  threadId: string | null;
  userMessageId: string | null;
  assistantMessageId: string | null;
  prompt: string;
  originalPrompt: string | null;
  provider: string;
  model: string;
  durationSeconds: number;
  aspectRatio: string;
  isAutoMode: boolean;
  /** The file-service id of the image the clip animates; null for text-to-video. */
  sourceFileId: string | null;
  status: VideoGenerationStatus;
  errorCode: string | null;
  errorMessage: string | null;
  providerOperationId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  latencyMs: number | null;
  supersededById: string | null;
  paygReservationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** OUTPUT assets only. */
  assets: VideoGenerationAssetRecord[];
};

/** What the API returns for one generation: the row with its clip flattened. */
export type VideoGenerationView = Omit<
  VideoGenerationRecord,
  'assets' | 'paygReservationId' | 'providerOperationId' | 'userId'
> & {
  asset: {
    id: string;
    url: string;
    downloadUrl: string;
    mimeType: string;
    sizeBytes: number | null;
  } | null;
};

export type VideoGenerationWithLatest = VideoGenerationView & {
  /** The head of the AUTO fallback chain: what the user actually got. */
  latest: VideoGenerationView;
};

export type CreateVideoGenerationData = {
  userId: string;
  threadId?: string | null;
  userMessageId?: string | null;
  assistantMessageId?: string | null;
  prompt: string;
  originalPrompt?: string | null;
  provider: string;
  model: string;
  durationSeconds: number;
  aspectRatio: string;
  isAutoMode: boolean;
  sourceFileId?: string | null;
};

export type StoreVideoResponse = { fileId: string };

/** What one provider call needs. Credentials come from the connector, never the caller. */
export type VideoProviderConfig = { baseUrl: string; apiKey: string };

export type VideoStartRequest = {
  model: string;
  prompt: string;
  durationSeconds: number;
  aspectRatio: string;
  /** Image-to-video: the clip starts from this image. */
  sourceImage?: VideoSourceImage;
};

/** A validated source image, ready for a provider body. */
export type VideoSourceImage = { base64: string; mimeType: string };

/** The slice of file-service's `GET /internal/files/:id/content` a source image needs. */
export type VideoSourceFileResponse = { mimeType: string; content: string | null };

export type VideoPollResult =
  | { state: 'PENDING' }
  | { state: 'DONE'; downloadUrl: string; durationSeconds?: number }
  | { state: 'FAILED'; code: VideoFailureCode; detail: string };

/** One provider's three steps: start a job, ask about it, fetch the finished clip. */
export type VideoProviderClient = {
  start: (config: VideoProviderConfig, request: VideoStartRequest) => Promise<string>;
  poll: (config: VideoProviderConfig, operationId: string) => Promise<VideoPollResult>;
  download: (config: VideoProviderConfig, downloadUrl: string) => Promise<Buffer>;
};

export type VideoSettlement = {
  hold: PaygHold;
  usage: PaygFinalizeUsage;
  calls: PaygFinalizeCalls;
};

export type ExecuteVideoInput = {
  generationId: string;
  requestId: string;
  userId: string;
  provider: string;
  model: string;
  prompt: string;
  durationSeconds: number;
  aspectRatio: string;
  sourceImage?: VideoSourceImage;
  isCancelled: () => Promise<boolean>;
  /** Called when the provider accepts the job (the operation / request id). */
  onOperation: (operationId: string) => Promise<void>;
  /** Called with the auth-service reservation id right after the hold is taken. */
  onHoldReserved: (reservationId: string) => Promise<void>;
};

export type ExecuteVideoResult = {
  fileId: string;
  sizeBytes: number;
  mimeType: string;
  durationSeconds: number;
  latencyMs: number;
  settlement: VideoSettlement;
};

export type VideoStaleJobRecord = {
  id: string;
  paygReservationId: string | null;
};

export interface VeoStartResponse {
  name?: string;
}

export interface VeoOperation {
  done?: boolean;
  error?: { code?: number; message?: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri?: string } }>;
      raiMediaFilteredCount?: number;
      raiMediaFilteredReasons?: string[];
    };
  };
}

export interface XaiVideoStartResponse {
  request_id?: string;
  id?: string;
}

export interface XaiVideoPollResponse {
  status?: string;
  video?: { url?: string; duration?: number };
  error?: string | { message?: string };
}

export interface ConnectorConfigResponse {
  provider: string;
  apiKey: string;
  baseUrl?: string | null;
}

export interface VeoInstance {
  prompt: string;
  /** Gemini API Veo shape: base64 bytes plus mimeType; `inlineData` is rejected by Veo. */
  image?: { bytesBase64Encoded: string; mimeType: string };
}
