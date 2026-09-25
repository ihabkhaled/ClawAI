import type { PaygReleaseReason } from '@claw/shared-entitlements';

import { SpeechProvider } from '../../../common/enums';
import { SpeechProviderError } from '../../../common/errors';
import { recordGet } from '../../../common/utilities/record-lookup.utility';
import type { Prisma } from '../../../generated/prisma';
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
  SPEECH_SETTLEMENT_RESERVE_MS,
} from '../constants/speech.constants';
import type {
  MessageSpeechResponse,
  SpeechCandidate,
  SpeechHold,
  SpeechSettlement,
  SpeechTokenUsage,
  StoredSpeech,
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
 * spoken, the synthesis generation (a re-synthesis after the stored audio
 * expired is a new call) and the candidate attempt (a fall-through is a
 * second paid call). A retried HTTP request for the same synthesis reuses its
 * hold, which is the point of idempotency.
 */
export function speechRequestId(
  messageId: string,
  contentHash: string,
  generation: number,
  attemptIndex: number,
): string {
  return `tts:${messageId}:${contentHash}:g${String(generation)}:${String(attemptIndex + 1)}`;
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

/** `reply-<messageId>.wav|.mp3` — the name the player's Download saves. */
export function speechFilename(messageId: string, mimeType: string): string {
  const safeId = messageId.replaceAll(/[^A-Za-z0-9_-]/g, '');
  return `${SPEECH_FILENAME_PREFIX}${safeId}.${mimeType === SPEECH_MIME_MP3 ? 'mp3' : 'wav'}`;
}

/** `metadata.speech` from a stored message, or null when absent or malformed. */
export function readStoredSpeech(metadata: unknown): StoredSpeech | null {
  if (!isRecord(metadata) || !isRecord(metadata['speech'])) {
    return null;
  }
  const speech = metadata['speech'];
  const text = (key: string): string | null =>
    typeof speech[key] === 'string' ? speech[key] : null;
  const count = (key: string): number | null =>
    typeof speech[key] === 'number' && Number.isInteger(speech[key]) ? speech[key] : null;
  const fileId = text('fileId');
  const contentHash = text('contentHash');
  return fileId === null || contentHash === null
    ? null
    : {
        fileId,
        contentHash,
        filename: text('filename') ?? '',
        mimeType: text('mimeType') ?? '',
        provider: text('provider') ?? '',
        model: text('model') ?? '',
        characters: count('characters') ?? 0,
        truncated: speech['truncated'] === true,
        generation: count('generation') ?? 1,
      };
}

/** The message's metadata with `speech` replaced; every other key kept. */
export function withStoredSpeech(
  metadata: Prisma.JsonValue | null,
  speech: StoredSpeech,
): Prisma.InputJsonObject {
  const kept: Prisma.JsonObject = isJsonObject(metadata) ? metadata : {};
  return { ...kept, speech };
}

function isJsonObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** What the client is told about a stored synthesis. `cached` = replayed, not charged. */
export function toSpeechResponse(speech: StoredSpeech, cached: boolean): MessageSpeechResponse {
  return {
    fileId: speech.fileId,
    mimeType: speech.mimeType,
    filename: speech.filename,
    truncated: speech.truncated,
    characters: speech.characters,
    cached,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The timeout one candidate may use: its own, cut to what is left of the
 * provider window, i.e. the request deadline minus the store AND settlement
 * reserves (SPEECH_POST_PROVIDER_RESERVE_MS). Null when too little is left to
 * start one, which also means no paid attempt starts that would leave the
 * store or the settlement no time: the walk ends with the service's own
 * TTS_FAILED rather than a gateway 504.
 */
export function speechAttemptTimeoutMs(
  candidateTimeoutMs: number,
  requestDeadlineAt: number,
  now: number,
): number | null {
  const remaining = requestDeadlineAt - SPEECH_POST_PROVIDER_RESERVE_MS - now;
  return remaining < SPEECH_MIN_ATTEMPT_MS ? null : Math.min(candidateTimeoutMs, remaining);
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
