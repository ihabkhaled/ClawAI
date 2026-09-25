import type { PaygReleaseReason, PlanFeature } from '@claw/shared-entitlements';

import { ENTITLEMENTS_TIMEOUT_MS } from '../../../common/constants';
import { SpeechProvider } from '../../../common/enums';

/**
 * "Read aloud" — text-to-speech of an assistant reply (multimodal batch 9,
 * ADR-120 addendum). The voice models are an admin choice (the TTS_VOICE
 * assistant role on the Smart Router tab), never a constant here (rule 51
 * item 7). Metered on PaygSurface.TTS; plan-gated by `allowTextToSpeech`.
 */
export const TTS_VOICE_CANDIDATES_PATH = '/api/v1/internal/assistant-models/TTS_VOICE/candidates';
export const TTS_VOICE_CANDIDATES_TIMEOUT_MS = 3_000;
/** Reused this long, so an admin change lands within a minute without a restart. */
export const TTS_VOICE_CANDIDATES_TTL_MS = 60_000;

export const TEXT_TO_SPEECH_PLAN_FEATURE: PlanFeature = 'allowTextToSpeech';

/**
 * At most this many characters are spoken. Raised from 4,000 on 2026-09-25
 * when synthesis became progressive: the text is split into segments of at
 * most `SPEECH_SEGMENT_MAX_CHARACTERS`, each its own provider call and hold,
 * so no single call approaches OpenAI's 4,096 limit or Gemini's ~36 chars/s
 * render ceiling. 12,000 characters is ≤ 21 segments; at concurrency 3 and
 * ~17 s per 600-character Gemini segment that is ~2 minutes, inside
 * `SPEECH_JOB_DEADLINE_MS`. A longer reply is cut at a sentence boundary and
 * the state says `truncated: true`, which the player shows (rule 37 item 16
 * spirit: a shortened result is never silent).
 */
export const SPEECH_MAX_CHARACTERS = 12_000;
/** The first segment is short so the first audio arrives fast (~4 s on Gemini). */
export const SPEECH_FIRST_SEGMENT_MAX_CHARACTERS = 160;
/** Every later segment: long enough to sound continuous, short enough to render in ~17 s. */
export const SPEECH_SEGMENT_MAX_CHARACTERS = 600;
/** A clause break (comma, semicolon, colon, dash, Arabic/CJK commas) when no sentence end fits. */
export const SPEECH_CLAUSE_END_PATTERN = /[,;:،؛、，；：](?=\s|$)|\s[–—-](?=\s)/gu;
/** A sentence break earlier than this share of the cap is not worth losing the rest for. */
export const SPEECH_TRUNCATION_MIN_SENTENCE_RATIO = 0.6;
/** Sentence ends across the 13 locales: Latin/Arabic/Devanagari marks before a space, CJK marks anywhere. */
export const SPEECH_SENTENCE_END_PATTERN = /[.!?؟।](?=\s|$)|[。！？]/gu;
/** Hex characters of the content hash kept on the message and in the requestId. */
export const SPEECH_CONTENT_HASH_LENGTH = 16;

// ── Providers ──────────────────────────────────────────────────────────────
/** routing's RouterProvider name → the speech adapter; anything absent is skipped. */
export const SPEECH_PROVIDER_BY_NAME: Readonly<Record<string, SpeechProvider>> = {
  GEMINI: SpeechProvider.GEMINI,
  OPENAI: SpeechProvider.OPENAI,
};
export const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
export const OPENAI_TTS_VOICE = 'alloy';
export const OPENAI_TTS_RESPONSE_FORMAT = 'mp3';
/**
 * OpenAI speech models chat-service meters exactly: priced per CHARACTER
 * (`ttsPerCharacterMicroUsd`). gpt-4o-mini-tts bills audio tokens its
 * response never reports, so it is skipped rather than settled on a guess.
 */
export const OPENAI_PER_CHARACTER_TTS_MODELS: ReadonlySet<string> = new Set(['tts-1', 'tts-1-hd']);

export const GEMINI_TTS_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const GEMINI_TTS_VOICE = 'Kore';
/** Every Gemini speech model id carries this; anything else is a text model. */
export const GEMINI_TTS_MODEL_MARKER = '-tts';
export const GEMINI_TTS_RESPONSE_MODALITY = 'AUDIO';
/** Gemini TTS returns 16-bit little-endian mono PCM at this rate unless the mime type says otherwise. */
export const GEMINI_TTS_DEFAULT_SAMPLE_RATE = 24_000;
export const GEMINI_TTS_CHANNELS = 1;
export const PCM_SAMPLE_RATE_PATTERN = /rate=(\d{4,6})/i;
/** Canonical RIFF/WAVE: 12-byte RIFF header + 24-byte fmt chunk + 8-byte data chunk header. */
export const WAV_HEADER_BYTES = 44;
export const WAV_FMT_CHUNK_BYTES = 16;
export const WAV_FORMAT_PCM = 1;
export const PCM_BITS_PER_SAMPLE = 16;
export const PCM_BYTES_PER_SAMPLE = 2;
/**
 * Hold sizing only — the finalize carries `usageMetadata`. Gemini audio is
 * ~25-32 tokens per second and speech runs ~10-15 characters per second, so
 * 4 tokens per character over-reserves roughly twofold, never under.
 */
export const GEMINI_TTS_OUTPUT_TOKENS_PER_CHARACTER = 4;
export const GEMINI_TTS_PROMPT_OVERHEAD_TOKENS = 16;

/** A per-character row bills no output tokens; the hold still names a ceiling. */
export const SPEECH_UNIT_PRICED_OUTPUT_TOKENS = 1;

// ── Progressive job (2026-09-25, ADR-120 addendum "TTS is asynchronous") ──────
/**
 * nginx's read timeout for `/api/v1/chat-messages/*` (the http-level
 * `proxy_read_timeout 60s;` — the location sets none). Kept as a mirror so
 * `speech-gateway-timeout.spec.ts` can prove no speech REQUEST waits on a
 * provider: POST answers 202 at once and the synthesis runs in a background
 * job with its own deadline. Found live 2026-09-25: a synchronous ~4,000-char
 * reading needed ~110 s of Gemini rendering and always died at 504.
 */
export const NGINX_CHAT_MESSAGES_READ_TIMEOUT_MS = 60_000;
/**
 * Wall-clock deadline of one synthesis job, from `startedAt`. No provider
 * attempt starts unless it, its store and its settlement fit inside it.
 */
export const SPEECH_JOB_DEADLINE_MS = 180_000;
/**
 * The Redis job lock outlives the deadline by this much, so a job that ends
 * on its deadline still writes its final state under the lock. A GENERATING
 * state older than deadline + grace is STALE (its replica died) and resumable.
 */
export const SPEECH_JOB_STALE_GRACE_MS = 30_000;
export const SPEECH_JOB_LOCK_TTL_MS = SPEECH_JOB_DEADLINE_MS + SPEECH_JOB_STALE_GRACE_MS;
export const SPEECH_JOB_LOCK_KEY_PREFIX = 'claw:chat:speech:job:';
/** SET NX PX: 1 when this replica now owns the job, 0 when a sibling does. */
export const SPEECH_JOB_LOCK_ACQUIRE_SCRIPT = `
if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PX', tonumber(ARGV[2])) then
  return 1
end
return 0
`;
/** Deletes the lock only when this replica still owns it (never a sibling's). */
export const SPEECH_JOB_LOCK_RELEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;
/** Provider calls in flight for one job. Segment 1 is queued first. */
export const SPEECH_SEGMENT_CONCURRENCY = 3;
/**
 * Per-attempt provider timeout, sized to the segment: 12 s + 60 ms per
 * character (Gemini renders ~36 chars/s ≈ 28 ms/char, so this is ~2x), at
 * most 40 s. A 160-char first segment gets 21.6 s, a 600-char one 40 s.
 */
export const SPEECH_SEGMENT_BASE_TIMEOUT_MS = 12_000;
export const SPEECH_SEGMENT_TIMEOUT_PER_CHARACTER_MS = 60;
export const SPEECH_SEGMENT_MAX_TIMEOUT_MS = 40_000;
/** A timed-out segment is retried this many times on the SAME candidate before the next one. */
export const SPEECH_SEGMENT_TIMEOUT_RETRIES = 1;
/**
 * Rate limits (2026-09-25, found live: a 1,000-char job ended PARTIAL when
 * Gemini answered 429 in 339 ms with 3 segments in flight, and the OpenAI
 * fallback was out of quota). A RATE_LIMITED attempt is released (never
 * charged) and retried on the SAME candidate after a wait, at most this many
 * times per candidate per segment, before the walk moves on.
 */
export const SPEECH_RATE_LIMIT_RETRIES = 3;
/** Backoff when the provider gives no hint: 1.5 s, 3 s, 6 s (× jitter). */
export const SPEECH_RATE_LIMIT_BASE_BACKOFF_MS = 1_500;
/** Jitter spreads concurrent retries: the wait is scaled by 1 ± this share. */
export const SPEECH_RATE_LIMIT_JITTER_RATIO = 0.2;
/**
 * No single rate-limit wait is longer than this. Jobs run in the background
 * (3-minute budget) while earlier segments already play, so waiting out a
 * per-minute window (Gemini's hint is typically 10-45 s) beats failing the
 * segment. A hint above it — e.g. ~29,800 s when a DAILY quota is spent, seen
 * live 2026-09-25 — cannot be honoured, so the segment moves on to the next
 * candidate instead of retrying early into a certain second 429. The job
 * deadline still bounds every wait.
 */
export const SPEECH_RATE_LIMIT_MAX_WAIT_MS = 45_000;
/** A job's provider calls in flight once any of its attempts was rate limited. */
export const SPEECH_RATE_LIMITED_CONCURRENCY = 1;
/** HTTP 429 Too Many Requests. */
export const HTTP_TOO_MANY_REQUESTS = 429;
/** Gemini's (google.rpc) status on a 429 body, and the detail type carrying `retryDelay`. */
export const GEMINI_RESOURCE_EXHAUSTED_STATUS = 'RESOURCE_EXHAUSTED';
export const GEMINI_RETRY_INFO_TYPE = 'type.googleapis.com/google.rpc.RetryInfo';
/**
 * OpenAI answers 429 for an exhausted BILLING quota too. That is not a rate
 * limit — no wait makes it succeed — so it is a plain provider failure.
 */
export const OPENAI_QUOTA_EXHAUSTED_CODE = 'insufficient_quota';
/** `"7s"`, `"1.5s"` (google.protobuf.Duration JSON) or a bare-seconds Retry-After (`"7"`). */
export const SPEECH_RETRY_SECONDS_PATTERN = /^\s*(\d+(?:\.\d+)?)s?\s*$/;
export const MS_PER_SECOND = 1_000;
/**
 * Reserved after a provider call for storing that segment's audio; also the
 * store call's own timeout.
 */
export const SPEECH_FILE_STORE_RESERVE_MS = 10_000;
/**
 * Kept free after the store for settling the hold: the hold stays OPEN until
 * the audio is stored, then ONE meter call finalizes (or releases) it.
 */
export const SPEECH_SETTLEMENT_RESERVE_MS = ENTITLEMENTS_TIMEOUT_MS;
/** Everything after the provider call: store the audio, then settle the hold. */
export const SPEECH_POST_PROVIDER_RESERVE_MS =
  SPEECH_FILE_STORE_RESERVE_MS + SPEECH_SETTLEMENT_RESERVE_MS;
/**
 * The wire reason for a hold released because the audio could not be stored.
 * auth-service's release DTO accepts PROVIDER_ERROR | CANCELLED | TIMEOUT only,
 * and the delivery was abandoned, so CANCELLED; the log line names the cause
 * (`reason=STORE_FAILED`).
 */
export const SPEECH_STORE_FAILED_RELEASE_REASON: PaygReleaseReason = 'CANCELLED';
/** What the settlement log line says caused that release. */
export const SPEECH_STORE_FAILED_LOG_REASON = 'STORE_FAILED';
/** An attempt is not started with less than this left of the job window — it could not finish. */
export const SPEECH_MIN_ATTEMPT_MS = 5_000;
/** Per-candidate timeout when the admin row has none, and the clamp on one that is longer. */
export const SPEECH_DEFAULT_TIMEOUT_MS = SPEECH_SEGMENT_MAX_TIMEOUT_MS;
export const SPEECH_MAX_TIMEOUT_MS = SPEECH_SEGMENT_MAX_TIMEOUT_MS;

// ── Sibling services ───────────────────────────────────────────────────────
export const SPEECH_CONNECTOR_CONFIG_PATH = '/api/v1/internal/connectors/config';
export const SPEECH_CONNECTOR_TIMEOUT_MS = 5_000;
/** "Is this provider configured?" is cached this long for the availability answer. */
export const SPEECH_CONNECTOR_STATUS_TTL_MS = 60_000;
export const SPEECH_FILE_STORE_PATH = '/api/v1/internal/files/store-generated-audio';
export const SPEECH_FILE_STATE_PATH = '/api/v1/internal/files/{FILE_ID}/ingestion-state';
export const SPEECH_FILE_STATE_TIMEOUT_MS = 3_000;

export const SPEECH_MIME_WAV = 'audio/wav';
export const SPEECH_MIME_MP3 = 'audio/mpeg';
export const SPEECH_FILENAME_PREFIX = 'reply-';
/** `metadata.speech.version` of the progressive (segmented) state. v1 had one `fileId`. */
export const SPEECH_STATE_VERSION = 2;

// ── Error codes (mapped to localized text by the frontend) ───────────────────
export const TTS_UNAVAILABLE_CODE = 'TTS_UNAVAILABLE';
export const TTS_UNAVAILABLE_MESSAGE = 'Read aloud is not available: no voice model is configured.';
export const TTS_FAILED_CODE = 'TTS_FAILED';
export const TTS_FAILED_MESSAGE = 'The voice model could not read this reply. Please try again.';
export const TTS_NOTHING_TO_READ_CODE = 'TTS_NOTHING_TO_READ';
export const TTS_NOTHING_TO_READ_MESSAGE = 'This message has no text to read aloud.';
export const TTS_CREDIT_CHECK_UNAVAILABLE_CODE = 'PAYG_PRICING_UNAVAILABLE';
export const TTS_CREDIT_CHECK_UNAVAILABLE_MESSAGE =
  'Credit checks are temporarily unavailable. Please try again shortly.';
export const TTS_CLAMPED_CODE = 'PAYG_CREDIT_EXHAUSTED';
export const TTS_CLAMPED_MESSAGE = 'Not enough credit to read this reply aloud.';
export const TTS_JOB_LOCK_UNAVAILABLE_MESSAGE =
  'Read aloud is temporarily unavailable. Please try again shortly.';
