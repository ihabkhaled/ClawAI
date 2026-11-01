import {
  type PaygFinalizeCalls,
  type PaygFinalizeUsage,
  type PaygHold,
} from '@claw/shared-entitlements';

import type { AudioGenerationStatus, AudioKind } from '../../../generated/prisma';

export type AudioGenerationAssetRecord = {
  id: string;
  generationId: string;
  storageKey: string;
  url: string;
  downloadUrl: string;
  mimeType: string;
  sizeBytes: number | null;
  durationSeconds: number | null;
};

export type AudioGenerationRecord = {
  id: string;
  userId: string;
  workspaceId: string | null;
  threadId: string | null;
  messageId: string | null;
  assistantMessageId: string | null;
  kind: AudioKind;
  prompt: string;
  provider: string;
  model: string;
  voice: string | null;
  format: string;
  status: AudioGenerationStatus;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  latencyMs: number | null;
  supersededById: string | null;
  paygReservationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  assets: AudioGenerationAssetRecord[];
};

/** The internal contract chat-service codes against. */
export type AudioInternalView = {
  id: string;
  status: AudioGenerationStatus;
  assetUrl?: string;
  mimeType?: string;
  durationSec?: number;
  errorCode?: string;
  errorMessage?: string;
  provider: string;
  model: string;
  kind: AudioKind;
};

/** What the user-facing routes return: the contract plus ids and the asset detail. */
export type AudioGenerationView = AudioInternalView & {
  threadId: string | null;
  messageId: string | null;
  supersededById: string | null;
  createdAt: Date;
  completedAt: Date | null;
  asset: {
    id: string;
    url: string;
    downloadUrl: string;
    mimeType: string;
    sizeBytes: number | null;
  } | null;
};

export type AudioGenerationWithLatest = AudioGenerationView & { latest: AudioGenerationView };

export type CreateAudioGenerationData = {
  userId: string;
  workspaceId?: string | null;
  threadId?: string | null;
  messageId?: string | null;
  kind: AudioKind;
  prompt: string;
  provider: string;
  model: string;
  voice?: string | null;
  format: string;
};

export type StoreAudioResponse = { fileId: string };

export type AudioProviderConfig = { baseUrl: string; apiKey: string };

export type AudioSynthesisRequest = {
  model: string;
  prompt: string;
  voice: string;
  format: string;
  /** Gemini TTS only: the ceiling the hold allows. Always sent when present. */
  maxOutputTokens?: number;
};

/** Token usage a provider reported (Gemini `usageMetadata`). */
export type AudioProviderUsage = { promptTokens: number; completionTokens: number };

export type AudioProviderResult = {
  bytes: Buffer;
  mimeType: string;
  durationSeconds: number | null;
  usage: AudioProviderUsage | null;
};

/** One provider call: text in, finished audio out. Providers answer synchronously. */
export type AudioProviderClient = {
  synthesize: (
    config: AudioProviderConfig,
    request: AudioSynthesisRequest,
  ) => Promise<AudioProviderResult>;
};

export type AudioSettlement = {
  hold: PaygHold;
  usage: PaygFinalizeUsage;
  calls: PaygFinalizeCalls;
};

export type ExecuteAudioInput = {
  generationId: string;
  requestId: string;
  userId: string;
  kind: AudioKind;
  provider: string;
  model: string;
  prompt: string;
  voice: string;
  format: string;
  isCancelled: () => Promise<boolean>;
  /** Called with the auth-service reservation id right after the hold is taken. */
  onHoldReserved: (reservationId: string) => Promise<void>;
};

export type ExecuteAudioResult = {
  fileId: string;
  sizeBytes: number;
  mimeType: string;
  durationSeconds: number | null;
  latencyMs: number;
  settlement: AudioSettlement;
};

export type AudioStaleJobRecord = { id: string; paygReservationId: string | null };

export interface ConnectorConfigResponse {
  provider: string;
  apiKey: string;
  baseUrl?: string | null;
}

export interface GeminiSpeechResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/** Gemini API Interactions response for Lyria: `steps[].content[]` with `audio` blocks. */
export interface LyriaInteractionResponse {
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; data?: string; mime_type?: string; text?: string }>;
  }>;
}

/** How a model is metered: per character sent, per song, or per token. */
export type AudioMeterMode = 'CHARACTERS' | 'SONG' | 'TOKENS';
