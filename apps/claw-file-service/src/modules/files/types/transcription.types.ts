import { type PaygHold } from '@claw/shared-entitlements';
import {
  type TranscriptionAttemptStatus,
  type TranscriptionCreditRefusalCode,
  type TranscriptionReserveStatus,
} from '../../../common/enums';

// B6b — audio transcription types.
//
// file-service must not import connector-service's own `connectors.types`
// (cross-service type coupling); these are the narrow read models of the two
// internal endpoints it actually consumes.

/** One row of `GET /api/v1/internal/connectors/models-snapshot`. */
export interface TranscriptionSnapshotEntry {
  provider: string;
  modelKey: string;
  /**
   * Built by connector-service's `ModelsSnapshotManager`; contains the string
   * `'AUDIO'` when the underlying row has `supportsAudio`.
   */
  modalitiesIn?: string[];
  /**
   * Not currently emitted by the snapshot, read defensively so the lookup keeps
   * working if the raw capability flag is ever surfaced directly.
   */
  supportsAudio?: boolean;
}

export interface TranscriptionSnapshotResponse {
  models: TranscriptionSnapshotEntry[];
}

/** `GET /api/v1/internal/connectors/config?provider=…`. */
export interface TranscriptionConnectorConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
}

/** The routing decision: which provider/model will be asked to transcribe. */
export interface TranscriptionCapability {
  provider: string;
  model: string;
}

/**
 * Token usage a provider REPORTED for one transcription. `cachedPromptTokens`
 * and `reasoningTokens` are SUBSETS of `promptTokens` / `completionTokens`,
 * the same convention the PAYG finalize wire uses.
 */
export interface TranscriptionTokenUsage {
  promptTokens: number;
  completionTokens: number;
  cachedPromptTokens: number;
  reasoningTokens: number;
}

/**
 * What one adapter call produced. `text` is the transcript; the other two are
 * the MEASURED quantities PAYG settles on (rule 37 item 17): Gemini reports
 * `usage`, OpenAI's `verbose_json` reports the clip's `durationSeconds`.
 * Either may be absent when the provider omitted it.
 */
export interface TranscriptionProviderResult {
  text: string;
  usage?: TranscriptionTokenUsage;
  durationSeconds?: number;
}

/** A transcription adapter. Every provider implementation has this shape. */
export type TranscriptionAdapter = (
  baseUrl: string,
  apiKey: string,
  base64: string,
  mimeType: string,
  model: string,
  maxOutputTokens?: number,
) => Promise<TranscriptionProviderResult>;

/** One provider attempt, as the PAYG meter needs to see it. */
export interface TranscriptionMeterInput {
  userId: string;
  fileId: string;
  provider: string;
  model: string;
  sizeBytes: number;
}

/** A readable credit refusal, recorded on the row instead of a transcript. */
export interface TranscriptionCreditRefusal {
  reasonCode: TranscriptionCreditRefusalCode;
  reason: string;
}

/**
 * A hold on one attempt, plus the quantities it was sized on. The finalize
 * falls back to these when the provider omits its own measurement, so a
 * missing `duration` or `usageMetadata` is never settled as $0.
 */
export interface TranscriptionMeterHold {
  hold: PaygHold;
  provider: string;
  requestId: string;
  reservedAudioSeconds: number;
  reservedPromptTokens: number;
}

/** The hold for one attempt. */
export interface TranscriptionReserveHeld {
  status: TranscriptionReserveStatus.HELD;
  meterHold: TranscriptionMeterHold;
}

/** No hold: the attempt must not call the provider. */
export interface TranscriptionReserveRefused extends TranscriptionCreditRefusal {
  status: TranscriptionReserveStatus.REFUSED;
}

/**
 * The hold for one attempt, or why there is none. A refusal is a RESULT, not a
 * throw, so the candidate loop cannot mistake it for a provider failure and
 * fall through to a second paid provider.
 */
export type TranscriptionReserveOutcome = TranscriptionReserveHeld | TranscriptionReserveRefused;

export interface TranscriptionAttemptCompleted {
  status: TranscriptionAttemptStatus.COMPLETED;
}

export interface TranscriptionAttemptRefused extends TranscriptionCreditRefusal {
  status: TranscriptionAttemptStatus.REFUSED;
}

/** How one candidate attempt ended when it did not throw. */
export type TranscriptionAttemptOutcome =
  TranscriptionAttemptCompleted | TranscriptionAttemptRefused;

// ---- Provider response read models ----
// The adapters live in `*.adapter.ts`, where ESLint forbids inline interface
// declarations, so the shapes they parse are owned here.

export interface GeminiPart {
  text?: string;
}

export interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}

/** Gemini's `usageMetadata`. `candidatesTokenCount` EXCLUDES thinking tokens. */
export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  cachedContentTokenCount?: number;
}

export interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
}

/** `response_format: verbose_json` — `duration` is the clip length in seconds. */
export interface OpenAiTranscriptionResponse {
  text?: string;
  duration?: number;
}
