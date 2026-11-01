import { type PaygReleaseReason } from '@claw/shared-entitlements';

import { AudioGenerationStatus } from '../../../generated/prisma';

/** One synchronous provider call; nothing here polls the provider, the CALLER polls our job. */
export const AUDIO_REQUEST_TIMEOUT_MS = 180_000;
export const AUDIO_STORE_TIMEOUT_MS = 120_000;
export const AUDIO_CONNECTOR_TIMEOUT_MS = 10_000;

/** A running row untouched this long is an orphan of a dead process. */
export const AUDIO_STALE_AFTER_MS = AUDIO_REQUEST_TIMEOUT_MS + 5 * 60 * 1_000;
export const AUDIO_STALE_SWEEP_INTERVAL_MS = 60_000;

/** file-service accepts 50 MB per file; this stops a runaway response before the upload. */
export const AUDIO_MAX_BYTES = 40 * 1024 * 1024;

/** OpenAI's /audio/speech refuses input longer than this. */
export const AUDIO_SPEECH_MAX_CHARACTERS = 4_096;
export const AUDIO_MUSIC_MAX_CHARACTERS = 4_000;

/** The only containers file-service stores for generated audio. */
export const AUDIO_MIME_MP3 = 'audio/mpeg';
export const AUDIO_MIME_WAV = 'audio/wav';
export const AUDIO_FORMATS = ['mp3', 'wav'] as const;
export const AUDIO_DEFAULT_FORMAT = 'mp3';

export const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1';
export const GEMINI_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/** Gemini TTS returns 16-bit little-endian mono PCM, 24 kHz unless the mime type says otherwise. */
export const GEMINI_TTS_DEFAULT_SAMPLE_RATE = 24_000;
export const GEMINI_TTS_CHANNELS = 1;
export const PCM_BYTES_PER_SAMPLE = 2;
export const PCM_SAMPLE_RATE_PATTERN = /rate=(\d{4,6})/iu;
export const WAV_HEADER_BYTES = 44;
export const WAV_FMT_CHUNK_BYTES = 16;
export const WAV_FORMAT_PCM = 1;
export const PCM_BITS_PER_SAMPLE = 16;

/** A Lyria 3 Clip is always 30 seconds (Gemini API music generation docs). */
export const LYRIA_CLIP_SECONDS = 30;
export const LYRIA_CLIP_MODEL_MARKER = 'clip';
export const GEMINI_TTS_MODEL_MARKER = '-tts';

/**
 * Hold sizing for Gemini TTS only (the finalize carries `usageMetadata`). Gemini audio
 * is about 25-32 tokens per second and speech runs 10-15 characters per second, so
 * 4 output tokens per character over-reserves roughly twofold, never under.
 */
export const GEMINI_TTS_OUTPUT_TOKENS_PER_CHARACTER = 4;
export const GEMINI_TTS_PROMPT_OVERHEAD_TOKENS = 16;
export const CHARACTERS_PER_TEXT_TOKEN = 4;

/** A per-unit row bills no tokens; the hold still names a ceiling. */
export const AUDIO_UNIT_PRICED_OUTPUT_TOKENS = 1;

export const AUDIO_ACTIVE_STATUSES: readonly AudioGenerationStatus[] = [
  AudioGenerationStatus.QUEUED,
  AudioGenerationStatus.RUNNING,
];

export const AUDIO_GENERATION_CANCELLED_CODE = 'AUDIO_GENERATION_CANCELLED';
export const AUDIO_GENERATION_CANCELLED_MESSAGE = 'Audio generation was cancelled by the user';

export const AUDIO_CANCELLED_RELEASE_REASON: PaygReleaseReason = 'CANCELLED';
export const AUDIO_STORE_FAILED_RELEASE_REASON: PaygReleaseReason = 'CANCELLED';
export const AUDIO_STALE_RELEASE_REASON: PaygReleaseReason = 'CANCELLED';

/** How many `supersededById` hops a reader follows to find the chain head. */
export const AUDIO_CHAIN_MAX_HOPS = 4;

export const AUDIO_CREDIT_FAILURE_MESSAGE =
  'Audio generation needs pay-as-you-go credit. Add credit and try again.';

export const AUDIO_ASSETS_INCLUDE = {
  assets: { orderBy: { createdAt: 'asc' as const } },
} as const;
