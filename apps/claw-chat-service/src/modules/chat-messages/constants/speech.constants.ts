import type { PlanFeature } from '@claw/shared-entitlements';

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
 * At most this many characters are spoken. OpenAI's `/audio/speech` accepts
 * 4,096; the cap also bounds the hold. A longer reply is cut at a sentence
 * boundary and the response says `truncated: true`, which the player shows
 * (rule 37 item 16 spirit: a shortened result is never silent).
 */
export const SPEECH_MAX_CHARACTERS = 4_000;
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

// ── Deadline vs the gateway ──────────────────────────────────────────────────
/**
 * nginx's read timeout for `POST /api/v1/chat-messages/:id/speech`. The
 * `location /api/v1/chat-messages` block in infra/nginx/locations.conf sets
 * none, so the http-level `proxy_read_timeout 60s;` in infra/nginx/nginx.conf
 * applies (the distributed template's 120s is looser, so 60s binds).
 * `speech-gateway-timeout.spec.ts` reads both files and fails on drift.
 *
 * Found live 2026-09-25: a hung Gemini TTS call aborted at its 60 s timeout
 * in the same second nginx gave up, so the browser got a gateway 504 instead
 * of chat-service's own TTS_FAILED — and the hold's release raced the socket.
 */
export const NGINX_CHAT_MESSAGES_READ_TIMEOUT_MS = 60_000;
/** Kept free after the whole request budget: response serialisation and the network. */
export const SPEECH_GATEWAY_HEADROOM_MS = 10_000;
/**
 * ONE end-to-end deadline for `POST /chat-messages/:id/speech`, set when the
 * request enters `MessageSpeechService.synthesize`: the replay check, every
 * provider attempt AND storing the audio all finish inside it, so the service
 * always answers (with its own mapped error) before nginx does.
 */
export const SPEECH_REQUEST_BUDGET_MS =
  NGINX_CHAT_MESSAGES_READ_TIMEOUT_MS - SPEECH_GATEWAY_HEADROOM_MS;
/**
 * Reserved out of the request budget for storing the audio. The provider walk
 * ends by `deadline - this`, so no attempt starts unless the store still fits
 * after it; it is also the store call's own timeout.
 */
export const SPEECH_FILE_STORE_RESERVE_MS = 10_000;
/** A candidate is not started with less than this left of the provider window — it could not finish. */
export const SPEECH_MIN_ATTEMPT_MS = 5_000;
/** Per-candidate timeout when the admin row has none, and the clamp on one that is longer. */
export const SPEECH_DEFAULT_TIMEOUT_MS = SPEECH_REQUEST_BUDGET_MS - SPEECH_FILE_STORE_RESERVE_MS;
export const SPEECH_MAX_TIMEOUT_MS = SPEECH_DEFAULT_TIMEOUT_MS;

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
