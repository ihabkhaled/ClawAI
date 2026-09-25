import type { PaygFinalizeCalls, PaygFinalizeUsage, PaygHold } from '@claw/shared-entitlements';
import type { SpeechUnavailableReason } from '@claw/shared-types';

import type { SpeechAttemptOutcome, SpeechProvider } from '../../../common/enums';
import type { Prisma } from '../../../generated/prisma';

/** routing-service's `GET internal/assistant-models/TTS_VOICE/candidates` row. */
export type TtsVoiceCandidateWire = {
  provider: string;
  modelAlias: string;
  timeoutMs: number;
  maxTokens: number;
};

export type CachedTtsVoiceCandidates = {
  candidates: readonly TtsVoiceCandidateWire[];
  expiresAt: number;
};

/** A TTS_VOICE candidate chat-service has an adapter for, ready to call. */
export type SpeechCandidate = {
  provider: SpeechProvider;
  model: string;
  timeoutMs: number;
  maxTokens: number;
};

/** A reply turned into what a voice should say, already capped. */
export type SpeakableText = {
  text: string;
  /** Code points, the unit OpenAI bills and the cap counts. */
  characters: number;
  truncated: boolean;
  contentHash: string;
};

export type SpeechTextCap = {
  text: string;
  truncated: boolean;
};

/** Audio a provider returned, in a container a browser plays. */
export type SynthesizedAudio = {
  bytes: Buffer;
  mimeType: string;
  /** Gemini's usageMetadata; null for a provider that reports none (OpenAI). */
  usage: SpeechTokenUsage | null;
};

export type SpeechTokenUsage = {
  promptTokens: number;
  completionTokens: number;
};

export type SpeechProviderRequest = {
  candidate: SpeechCandidate;
  text: string;
  apiKey: string;
  maxOutputTokens: number;
};

export type SpeechSynthesisInput = {
  userId: string;
  messageId: string;
  speakable: SpeakableText;
  /** Increments each time this message is synthesised anew, so a new call never reuses a settled hold. */
  generation: number;
  /** Epoch ms: the request's end-to-end deadline (SPEECH_REQUEST_BUDGET_MS from entry). */
  deadlineAt: number;
};

export type SpeechAttemptRecord = {
  provider: SpeechProvider;
  model: string;
  requestId: string | null;
  outcome: SpeechAttemptOutcome;
  latencyMs: number;
};

export type SpeechSynthesisResult = {
  audio: SynthesizedAudio;
  candidate: SpeechCandidate;
  attempts: readonly SpeechAttemptRecord[];
  /** The winning attempt's hold, still OPEN: settled only after the audio is stored. */
  settlement: SpeechSettlement;
};

/** `metadata.speech` on the assistant message — never the audio bytes. */
export type StoredSpeech = {
  fileId: string;
  filename: string;
  mimeType: string;
  provider: string;
  model: string;
  characters: number;
  truncated: boolean;
  contentHash: string;
  generation: number;
};

export type StoreSpeechFileInput = {
  userId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
  transcript: string;
  /** Cut from the request deadline by `speechStoreTimeoutMs`. */
  timeoutMs: number;
};

/** `POST /chat-messages/:id/speech` response. */
export type MessageSpeechResponse = {
  fileId: string;
  mimeType: string;
  filename: string;
  truncated: boolean;
  characters: number;
  /** True when an earlier synthesis was replayed — no provider call, no charge. */
  cached: boolean;
};

/** `GET /chat-messages/speech/availability` response. */
export type SpeechAvailability = {
  available: boolean;
  reason: SpeechUnavailableReason | null;
};

/** The owned assistant message a synthesis reads. */
export type SpeechSourceMessage = {
  id: string;
  content: string;
  metadata: Prisma.JsonValue | null;
};

/** Gemini `generateContent` response, only the fields TTS reads. */
export type GeminiSpeechResponse = {
  candidates?: ReadonlyArray<{
    content?: { parts?: ReadonlyArray<{ inlineData?: { mimeType?: string; data?: string } }> };
  }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

export type ConnectorKeyResponse = {
  apiKey?: string | null;
};

export type CachedConnectorStatus = {
  configured: boolean;
  expiresAt: number;
};

/** The hold for one candidate attempt, with what it was sized on. */
export type SpeechHold = {
  hold: PaygHold;
  requestId: string;
  promptTokens: number;
  outputTokens: number;
};

/** An open hold plus the measured units it will finalize on. */
export type SpeechSettlement = {
  held: SpeechHold;
  usage: PaygFinalizeUsage;
  calls: PaygFinalizeCalls;
};

/** One candidate attempt's result inside the walk. */
export type SpeechAttemptResult = {
  record: SpeechAttemptRecord;
  delivered?: { audio: SynthesizedAudio; settlement: SpeechSettlement };
};
