import { type PaygFinalizeUsage, type PaygReleaseReason } from '@claw/shared-entitlements';
import { BillingErrorCode } from '@claw/shared-types';
import { TranscriptionCreditRefusalCode } from '../../../common/enums';
import {
  GEMINI_AUDIO_TOKENS_PER_SECOND,
  TRANSCRIPTION_CREDIT_CHECK_UNAVAILABLE_MESSAGE,
  TRANSCRIPTION_INSUFFICIENT_CREDIT_MESSAGE,
  TRANSCRIPTION_PAYG_CHARS_PER_TOKEN,
  TRANSCRIPTION_PAYG_INSTRUCTION_TOKENS,
  TRANSCRIPTION_PAYG_MAX_AUDIO_SECONDS,
  TRANSCRIPTION_PAYG_MIN_AUDIO_BYTES_PER_SECOND,
  TRANSCRIPTION_PAYG_MIN_AUDIO_SECONDS,
  TRANSCRIPTION_PAYG_OUTPUT_TOKEN_HEADROOM,
  TRANSCRIPTION_PAYG_OUTPUT_TOKENS_PER_SECOND,
  TRANSCRIPTION_PAYG_PER_SECOND_PROVIDERS,
  TRANSCRIPTION_PAYG_REQUEST_ID_PREFIX,
  TRANSCRIPTION_PAYG_TIMEOUT_ERROR_CODES,
} from '../constants/transcription-payg.constants';
import {
  type TranscriptionCreditRefusal,
  type TranscriptionProviderResult,
} from '../types/transcription.types';

// None of these functions touch money. They size QUANTITIES (seconds, tokens)
// that auth-service prices; every value is an integer before it leaves here.

/**
 * The idempotency key of one paid provider attempt. Stable across a
 * redelivered job (the same attempt reuses its open hold) and distinct per
 * provider (a fall-through to a second provider is a second paid call).
 */
export function transcriptionRequestId(fileId: string, provider: string): string {
  return `${TRANSCRIPTION_PAYG_REQUEST_ID_PREFIX}:${fileId}:${provider}`;
}

function clampSeconds(seconds: number): number {
  return Math.min(
    TRANSCRIPTION_PAYG_MAX_AUDIO_SECONDS,
    Math.max(TRANSCRIPTION_PAYG_MIN_AUDIO_SECONDS, seconds),
  );
}

/**
 * The LONGEST the clip could be, from its byte size and an assumed bitrate
 * floor. Rounded up and bounded to the wire's range.
 */
export function estimateWorstCaseAudioSeconds(sizeBytes: number): number {
  const bytes = Math.max(0, Math.floor(sizeBytes));
  return clampSeconds(Math.ceil(bytes / TRANSCRIPTION_PAYG_MIN_AUDIO_BYTES_PER_SECOND));
}

/** Gemini prompt tokens for a clip of `seconds`: audio tokens plus the instruction. */
export function estimateGeminiPromptTokens(seconds: number): number {
  return seconds * GEMINI_AUDIO_TOKENS_PER_SECOND + TRANSCRIPTION_PAYG_INSTRUCTION_TOKENS;
}

/** Output ceiling requested for a token-priced transcript of `seconds`. */
export function estimateTranscriptOutputTokens(seconds: number): number {
  return (
    seconds * TRANSCRIPTION_PAYG_OUTPUT_TOKENS_PER_SECOND + TRANSCRIPTION_PAYG_OUTPUT_TOKEN_HEADROOM
  );
}

/**
 * Seconds to settle an OpenAI transcription on: the MEASURED `duration` from
 * `verbose_json`, rounded up to a whole second. When the provider omitted it
 * (or sent something unusable) the reserved estimate is used instead —
 * settling on zero would make the call free (rule 37 item 17).
 */
export function measuredAudioSeconds(
  durationSeconds: number | undefined,
  reservedSeconds: number,
): number {
  const usable =
    typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0;
  return usable ? clampSeconds(Math.ceil(durationSeconds)) : reservedSeconds;
}

/**
 * Token usage to settle a Gemini transcription on. The reported
 * `usageMetadata` when present; otherwise the reserved prompt estimate plus a
 * character-derived completion count, so a missing usage block is never $0.
 */
export function measuredTokenUsage(
  result: TranscriptionProviderResult,
  reservedPromptTokens: number,
): PaygFinalizeUsage {
  return (
    result.usage ?? {
      promptTokens: reservedPromptTokens,
      completionTokens: Math.ceil(result.text.length / TRANSCRIPTION_PAYG_CHARS_PER_TOKEN),
      cachedPromptTokens: 0,
      reasoningTokens: 0,
    }
  );
}

/** True when this provider's transcription is priced per second of audio. */
export function isPerSecondPricedProvider(provider: string): boolean {
  return TRANSCRIPTION_PAYG_PER_SECOND_PROVIDERS.includes(provider.toUpperCase());
}

/**
 * Maps the meter's refusal onto the two reasons a user is shown.
 *
 * "The check could not run" (meter unreachable, model unpriced) is NOT "you
 * have no credit": telling a funded user to top up during an auth outage sends
 * them to pay for nothing. Every other refusal is a balance one.
 */
export function transcriptionRefusalCode(
  errorCode: BillingErrorCode,
): TranscriptionCreditRefusalCode {
  return errorCode === BillingErrorCode.PAYG_PRICING_UNAVAILABLE ||
    errorCode === BillingErrorCode.PAYG_MODEL_UNPRICED
    ? TranscriptionCreditRefusalCode.CREDIT_CHECK_UNAVAILABLE
    : TranscriptionCreditRefusalCode.INSUFFICIENT_CREDIT;
}

/** The readable refusal recorded on the row for `code`. */
export function transcriptionRefusal(
  code: TranscriptionCreditRefusalCode,
): TranscriptionCreditRefusal {
  return {
    reasonCode: code,
    reason:
      code === TranscriptionCreditRefusalCode.CREDIT_CHECK_UNAVAILABLE
        ? TRANSCRIPTION_CREDIT_CHECK_UNAVAILABLE_MESSAGE
        : TRANSCRIPTION_INSUFFICIENT_CREDIT_MESSAGE,
  };
}

/** Why a hold goes back: a provider timeout is reported as one, anything else as an error. */
export function transcriptionReleaseReason(error: unknown): PaygReleaseReason {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  return typeof code === 'string' && TRANSCRIPTION_PAYG_TIMEOUT_ERROR_CODES.includes(code)
    ? 'TIMEOUT'
    : 'PROVIDER_ERROR';
}
