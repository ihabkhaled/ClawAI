import { type TranscriptionProviderResult } from './transcription.types';

// ADR-221 — platform-paid chunk transcription (Live Intelligence).

/** `POST /internal/files/transcribe-chunk` 200 body. */
export interface TranscribeChunkResult {
  /** Trimmed transcript; `''` when `noSpeech`. Never invented. */
  text: string;
  /** Provider-detected language, or null when the provider did not report one. */
  language: string | null;
  provider: string;
  model: string | null;
  /** Measured (ffprobe) seconds, else the provider's, else 0. */
  durationSeconds: number;
  /** Platform cost ESTIMATE in integer micro-USD; 0 for LOCAL or an unpriced model. */
  costMicroUsd: number;
  /** False when the rate card could not be read: `costMicroUsd` is then 0, not a measurement. */
  costKnown: boolean;
  /** The provider answered with no text: a gap, not a failure. */
  noSpeech: boolean;
}

/** What the cost estimate needs from one completed provider call. */
export interface ChunkCostInput {
  provider: string;
  /** Seconds the clip measured (ffprobe), when known. */
  measuredSeconds?: number;
  sizeBytes: number;
  result: TranscriptionProviderResult;
}
