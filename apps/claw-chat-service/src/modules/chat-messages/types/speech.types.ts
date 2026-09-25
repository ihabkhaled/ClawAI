import type { PaygFinalizeCalls, PaygFinalizeUsage, PaygHold } from '@claw/shared-entitlements';
import type { SpeechUnavailableReason } from '@claw/shared-types';

import type { SpeechAttemptOutcome, SpeechJobStatus, SpeechProvider } from '../../../common/enums';
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

/** One piece of the speakable text, synthesised as its own provider call and hold. */
export type SpeechTextSegment = {
  /** 0-based position; playback order. */
  index: number;
  text: string;
  /** Code points, the unit OpenAI bills. */
  characters: number;
};

/** One segment's synthesis: the walk over the TTS_VOICE candidates for that text. */
export type SpeechSynthesisInput = {
  userId: string;
  messageId: string;
  contentHash: string;
  /** Increments each time this message is synthesised anew, so a new call never reuses a settled hold. */
  generation: number;
  segment: SpeechTextSegment;
  /** Epoch ms: the job's wall-clock deadline (`SPEECH_JOB_DEADLINE_MS` from `startedAt`). */
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

/** One stored, charged segment in `metadata.speech.segments` — never the audio bytes. */
export type StoredSpeechSegment = {
  index: number;
  fileId: string;
  mimeType: string;
  characters: number;
  provider: string;
  model: string;
};

/** `metadata.speech` (version 2) on the assistant message — the job's durable state. */
export type SpeechJobState = {
  version: number;
  status: SpeechJobStatus;
  contentHash: string;
  generation: number;
  /** ISO time the current job started; a GENERATING state older than the deadline is stale. */
  startedAt: string;
  totalSegments: number;
  characters: number;
  truncated: boolean;
  /** In index order. */
  segments: StoredSpeechSegment[];
  errorCode: string | null;
};

export type StoreSpeechFileInput = {
  userId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
  transcript: string;
  /** Cut from the job deadline by `speechStoreTimeoutMs`. */
  timeoutMs: number;
};

/** A segment as the client sees it: enough to fetch and play it in order. */
export type SpeechSegmentResponse = {
  index: number;
  fileId: string;
  mimeType: string;
  characters: number;
};

/** `GET` and `POST /chat-messages/:id/speech` response. */
export type MessageSpeechStateResponse = {
  status: SpeechJobStatus;
  segments: SpeechSegmentResponse[];
  /** 0 until a job has split the text. */
  totalSegments: number;
  truncated: boolean;
  errorCode: string | null;
};

/** What `MessageSpeechService.start` answers: the state, and 200 (READY) or 202 (running). */
export type MessageSpeechStartResult = {
  httpStatus: number;
  body: MessageSpeechStateResponse;
};

/** Everything one background job needs; built by `MessageSpeechService.start`. */
export type SpeechJobInput = {
  userId: string;
  messageId: string;
  /** Owned by the caller's Redis lock; released by the job when it ends. */
  lockToken: string;
  speakable: SpeakableText;
  segments: readonly SpeechTextSegment[];
  /** The state as written when the job started (segments kept from a PARTIAL run included). */
  state: SpeechJobState;
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

/** A running job's mutable bookkeeping; lives only inside `SpeechJobManager.run`. */
export type SpeechJobProgress = {
  state: SpeechJobState;
  /** Set once: every worker stops taking segments (credit refusal, no voice, deadline). */
  stopCode: string | null;
  /** The last segment failure's code, for a PARTIAL / FAILED state. */
  errorCode: string | null;
  /** Metadata writes, chained so two segments finishing together never interleave. */
  writes: Promise<void>;
};
