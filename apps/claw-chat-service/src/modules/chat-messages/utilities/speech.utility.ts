import type { PaygReleaseReason } from '@claw/shared-entitlements';

import { SpeechProvider } from '../../../common/enums';
import { SpeechProviderError } from '../../../common/errors';
import { recordGet } from '../../../common/utilities/record-lookup.utility';
import {
  GEMINI_TTS_MODEL_MARKER,
  GEMINI_TTS_OUTPUT_TOKENS_PER_CHARACTER,
  GEMINI_TTS_PROMPT_OVERHEAD_TOKENS,
  OPENAI_PER_CHARACTER_TTS_MODELS,
  SPEECH_DEFAULT_TIMEOUT_MS,
  SPEECH_FILE_STORE_RESERVE_MS,
  SPEECH_FILENAME_PREFIX,
  SPEECH_MAX_TIMEOUT_MS,
  SPEECH_MIME_MP3,
  SPEECH_MIN_ATTEMPT_MS,
  SPEECH_POST_PROVIDER_RESERVE_MS,
  SPEECH_PROVIDER_BY_NAME,
  SPEECH_SEGMENT_BASE_TIMEOUT_MS,
  SPEECH_SEGMENT_MAX_TIMEOUT_MS,
  SPEECH_SEGMENT_TIMEOUT_PER_CHARACTER_MS,
  SPEECH_SETTLEMENT_RESERVE_MS,
} from '../constants/speech.constants';
import type {
  SpeechCandidate,
  SpeechHold,
  SpeechSettlement,
  SpeechTokenUsage,
  TtsVoiceCandidateWire,
} from '../types/speech.types';

/**
 * TTS_VOICE rows chat-service can actually call and meter exactly, in order.
 * Skipped: a provider with no speech adapter, an OpenAI model not priced per
 * character (gpt-4o-mini-tts reports no usage to settle on), a Gemini id that
 * is not a `-tts` model. Timeouts are clamped so one candidate cannot hold a
 * request open indefinitely.
 */
export function toSpeechCandidates(wire: readonly TtsVoiceCandidateWire[]): SpeechCandidate[] {
  return wire.flatMap((row): SpeechCandidate[] => {
    const provider = speechProviderOf(row.provider);
    if (provider === null || !isSupportedSpeechModel(provider, row.modelAlias)) {
      return [];
    }
    const timeoutMs =
      row.timeoutMs > 0
        ? Math.min(row.timeoutMs, SPEECH_MAX_TIMEOUT_MS)
        : SPEECH_DEFAULT_TIMEOUT_MS;
    return [{ provider, model: row.modelAlias, timeoutMs, maxTokens: row.maxTokens }];
  });
}

export function isSupportedSpeechModel(provider: SpeechProvider, model: string): boolean {
  return provider === SpeechProvider.OPENAI
    ? OPENAI_PER_CHARACTER_TTS_MODELS.has(model)
    : model.toLowerCase().includes(GEMINI_TTS_MODEL_MARKER);
}

function speechProviderOf(value: string): SpeechProvider | null {
  return recordGet(SPEECH_PROVIDER_BY_NAME, value.toUpperCase()) ?? null;
}

/** OpenAI tts-1 / tts-1-hd bill characters (`ttsPerCharacterMicroUsd`); Gemini bills tokens. */
export function isPerCharacterPriced(candidate: SpeechCandidate): boolean {
  return candidate.provider === SpeechProvider.OPENAI;
}

/**
 * One key per PAID CALL (rule 37 item 15): the message, the exact text
 * spoken, the synthesis generation (a new job — a retry after FAILED/PARTIAL,
 * a stale job, an expired file — is a new call and never reuses a settled
 * hold), the segment, and the attempt inside that segment's walk (a timeout
 * retry or a fall-through is a second paid call). A second POST while a job
 * runs starts no job at all, so it makes no key.
 */
export function speechRequestId(
  messageId: string,
  contentHash: string,
  generation: number,
  segmentIndex: number,
  attemptNumber: number,
): string {
  return `tts:${messageId}:${contentHash}:g${String(generation)}:seg${String(segmentIndex + 1)}:${String(attemptNumber)}`;
}

/** Output ceiling to reserve for a Gemini synthesis of `characters`, within the admin's cap. */
export function geminiSpeechOutputTokens(characters: number, maxTokens: number): number {
  return Math.max(1, Math.min(maxTokens, characters * GEMINI_TTS_OUTPUT_TOKENS_PER_CHARACTER));
}

/** Prompt tokens to reserve for a Gemini synthesis — the text plus the request overhead. */
export function geminiSpeechPromptTokens(textTokens: number): number {
  return textTokens + GEMINI_TTS_PROMPT_OVERHEAD_TOKENS;
}

/** Measured Gemini usage, or the reserved estimate when the provider reported none. */
export function measuredSpeechUsage(
  usage: SpeechTokenUsage | null,
  reservedPromptTokens: number,
  reservedOutputTokens: number,
): SpeechTokenUsage {
  return {
    promptTokens: usage?.promptTokens ?? reservedPromptTokens,
    completionTokens: usage?.completionTokens ?? reservedOutputTokens,
  };
}

/**
 * What the hold will settle on, captured from the provider response the
 * moment it arrives: characters sent (OpenAI, per-character) or Gemini's
 * usageMetadata (the reserved estimate when it reported none). Settled only
 * after the audio is stored (rule 37 item 17), still on these measured units.
 */
export function speechSettlement(
  held: SpeechHold,
  candidate: SpeechCandidate,
  characters: number,
  usage: SpeechTokenUsage | null,
): SpeechSettlement {
  if (isPerCharacterPriced(candidate)) {
    return {
      held,
      usage: { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      calls: { toolCalls: 0, ttsCharacters: characters },
    };
  }
  const measured = measuredSpeechUsage(usage, held.promptTokens, held.outputTokens);
  return {
    held,
    usage: { ...measured, cachedPromptTokens: 0, reasoningTokens: 0 },
    calls: { toolCalls: 0 },
  };
}

export function speechReleaseReason(error: unknown): PaygReleaseReason {
  return error instanceof SpeechProviderError && error.timedOut ? 'TIMEOUT' : 'PROVIDER_ERROR';
}

export function isSpeechTimeout(error: unknown): boolean {
  return error instanceof SpeechProviderError && error.timedOut;
}

/** `reply-<messageId>-<n>.wav|.mp3` — one stored file per segment, 1-based. */
export function speechFilename(messageId: string, mimeType: string, segmentIndex: number): string {
  const safeId = messageId.replaceAll(/[^A-Za-z0-9_-]/g, '');
  const extension = mimeType === SPEECH_MIME_MP3 ? 'mp3' : 'wav';
  return `${SPEECH_FILENAME_PREFIX}${safeId}-${String(segmentIndex + 1)}.${extension}`;
}

/** A segment's own provider timeout: 12 s + 60 ms per character, at most 40 s. */
export function segmentTimeoutMs(characters: number): number {
  return Math.min(
    SPEECH_SEGMENT_MAX_TIMEOUT_MS,
    SPEECH_SEGMENT_BASE_TIMEOUT_MS + characters * SPEECH_SEGMENT_TIMEOUT_PER_CHARACTER_MS,
  );
}

/**
 * The timeout one attempt may use: the smallest of the candidate's own, the
 * segment's (sized to its length) and what is left of the job window once
 * the store AND settlement reserves are kept free. Null when too little is
 * left to start one: no paid attempt starts that could not be stored and
 * settled before the job's deadline.
 */
export function speechAttemptTimeoutMs(
  candidateTimeoutMs: number,
  segmentCharacters: number,
  jobDeadlineAt: number,
  now: number,
): number | null {
  const remaining = jobDeadlineAt - SPEECH_POST_PROVIDER_RESERVE_MS - now;
  return remaining < SPEECH_MIN_ATTEMPT_MS
    ? null
    : Math.min(candidateTimeoutMs, segmentTimeoutMs(segmentCharacters), remaining);
}

/**
 * The store call's timeout: the reserve, cut to what is left of the request
 * deadline once the settlement reserve is kept free. Null when nothing is
 * left, and the caller releases the hold and answers TTS_FAILED at once.
 */
export function speechStoreTimeoutMs(requestDeadlineAt: number, now: number): number | null {
  const remaining = requestDeadlineAt - SPEECH_SETTLEMENT_RESERVE_MS - now;
  return remaining <= 0 ? null : Math.min(SPEECH_FILE_STORE_RESERVE_MS, remaining);
}
