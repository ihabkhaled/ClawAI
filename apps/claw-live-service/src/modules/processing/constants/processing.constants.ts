import { LiveCapability, LiveRunStatus, LiveSessionState } from '../../../generated/prisma';

// ── Identity ────────────────────────────────────────────────────────────────

/** Part of processingKey: bump when the pipeline's output semantics change (section 2). */
export const PIPELINE_VERSION = 1;

// ── Lease and reconciler (section 3) ────────────────────────────────────────

export const RUN_LEASE_SECONDS = 15;
export const RUN_LEASE_MS = RUN_LEASE_SECONDS * 1000;
export const RECONCILE_INTERVAL_MS = 2000;
/** Statuses a worker may write under (fenced commit). */
export const FENCED_RUN_STATUSES: readonly LiveRunStatus[] = [
  LiveRunStatus.PENDING,
  LiveRunStatus.ACTIVE,
  LiveRunStatus.DELAYED,
  LiveRunStatus.STOPPING,
];
/** Statuses that keep a run alive (activeKey set). */
export const LIVE_RUN_STATUSES: readonly LiveRunStatus[] = [
  LiveRunStatus.PENDING,
  LiveRunStatus.ACTIVE,
  LiveRunStatus.DELAYED,
];
/** Viewer states that keep a run alive (everything but DETACHED and the stopped side states). */
export const ATTACHED_SESSION_STATES: readonly LiveSessionState[] = [
  LiveSessionState.CONNECTING,
  LiveSessionState.ACTIVE,
  LiveSessionState.PAUSED,
  LiveSessionState.CREDITS_REQUIRED,
  LiveSessionState.GRACE,
];
export const PRISMA_UNIQUE_VIOLATION = 'P2002';
/** Capabilities that never get a run (no analysis, no billing): the session is UNSUPPORTED. */
export const NO_RUN_CAPABILITIES: readonly LiveCapability[] = [
  LiveCapability.PLAYER_ONLY,
  LiveCapability.LINK_ONLY,
];

// ── Worker loop ─────────────────────────────────────────────────────────────

export const WORKER_POLL_MS = 2000;
/** No processed chunk for this long → DELAYED. */
export const WORKER_DELAYED_AFTER_MS = 20_000;
/** Consecutive failed playlist polls before the run is FAILED (~60 s). */
export const WORKER_MAX_POLL_FAILURES = 30;
export const WORKER_TEMP_PREFIX = 'claw-live-run-';
export const FFMPEG_BINARY = 'ffmpeg';
export const FFMPEG_DECODE_TIMEOUT_MS = 20_000;
export const FFMPEG_FRAME_TIMEOUT_MS = 10_000;
export const FFMPEG_MAX_PCM_BYTES = 32 * 1024 * 1024;
export const FFMPEG_MAX_FRAME_BYTES = 2 * 1024 * 1024;

// ── Audio chunks (section 4) ────────────────────────────────────────────────

export const AUDIO_SAMPLE_RATE = 16_000;
export const AUDIO_CHANNELS = 1;
export const AUDIO_BYTES_PER_SAMPLE = 2;
export const AUDIO_CHUNK_SECONDS = 6;
export const AUDIO_CHUNK_BYTES =
  AUDIO_CHUNK_SECONDS * AUDIO_SAMPLE_RATE * AUDIO_CHANNELS * AUDIO_BYTES_PER_SAMPLE;
/** A trailing partial chunk shorter than this is dropped at stream end. */
export const AUDIO_MIN_FLUSH_BYTES = AUDIO_SAMPLE_RATE * AUDIO_BYTES_PER_SAMPLE;
/** A media-time jump larger than this between segments restarts the PCM buffer (gap). */
export const AUDIO_DISCONTINUITY_MS = 1500;
export const AUDIO_CHUNK_MIME = 'audio/wav';

// ── Browser capture (viewer tab audio, architecture section 4) ──────────────

/** Redis list of pending tab-audio chunks per run: `live:capture:<runId>`. */
export const LIVE_CAPTURE_QUEUE_KEY_PREFIX = 'live:capture:';
/** The list keeps only the newest chunks (LTRIM): a stalled worker never back-fills minutes. */
export const LIVE_CAPTURE_QUEUE_MAX = 20;
/** A queue nobody drains disappears on its own. */
export const LIVE_CAPTURE_QUEUE_TTL_SECONDS = 120;
/** Most chunks one worker tick pops. */
export const LIVE_CAPTURE_POLL_BATCH = 20;
/** Queue entry header: startAt and endAt as big-endian int64 epoch ms, then the WAV. */
export const LIVE_CAPTURE_ENTRY_HEADER_BYTES = 16;

// ── STT (file-service transcribe-chunk) ─────────────────────────────────────

export const TRANSCRIBE_CHUNK_PATH = '/api/v1/internal/files/transcribe-chunk';
export const TRANSCRIBE_TIMEOUT_MS = 20_000;
export const TRANSCRIBE_RETRY_DELAYS_MS: readonly number[] = [500, 1500];

// ── Summaries (section 4) ───────────────────────────────────────────────────

// 2026-11-24: the feed was too slow and too thin. A card every ~18 s of speech (was 30 s), a
// larger reply for richer cards in scripts that cost more tokens (Arabic, Hindi), a longer memory.
export const SUMMARY_MIN_NEW_TRANSCRIPT_MS = 18_000;
export const SUMMARY_PAUSE_TRIGGER_MS = 6000;
export const SUMMARY_WINDOW_MS = 90_000;
export const SUMMARY_MAX_OUTPUT_TOKENS = 1600;
export const WORKING_SUMMARY_MAX_CHARS = 4000;
export const SNAPSHOT_INTERVAL_MS = 10 * 60_000;
export const HIGHLIGHT_DEDUPE_SIMILARITY = 0.8;
export const HIGHLIGHT_DEDUPE_WINDOW_MS = 120_000;
export const HIGHLIGHT_MEMORY_LIMIT = 40;
export const VISUAL_NOTE_LIMIT = 8;
export const STREAM_DATA_OPEN = '<<<STREAM_DATA';
export const STREAM_DATA_CLOSE = 'STREAM_DATA>>>';
export const FINAL_EVENT_KEY = 'final';
export const FINAL_MAX_CARDS = 60;

// ── Context research (2026-11-24) ────────────────────────────────────────────
// The summarizer may ask for ONE short web search (a lyric line, a name, an event) when it cannot
// place what it hears. research-service SEARCH_ONLY, platform-paid, bounded per run.

export const RESEARCH_RUNS_PATH = '/api/v1/internal/research/runs';
export const RESEARCH_PLATFORM_USER = 'platform:live-intelligence';
export const RESEARCH_TIMEOUT_MS = 20_000;
export const RESEARCH_MAX_RESULTS = 4;
export const RESEARCH_MIN_INTERVAL_MS = 60_000;
export const RESEARCH_MAX_PER_RUN = 20;
export const RESEARCH_QUERY_MAX_CHARS = 120;
export const RESEARCH_SNIPPET_MAX_CHARS = 280;
export const WEB_NOTE_LIMIT = 8;

// ── Translation ─────────────────────────────────────────────────────────────

export const TRANSLATION_LANGUAGE_CACHE_MS = 5000;
export const TRANSLATION_CAPTION_BATCH = 2;
export const TRANSLATION_CAPTION_MAX_WAIT_MS = 3000;
export const TRANSLATION_MAX_OUTPUT_TOKENS = 1200;

// ── Vision (section 4) ──────────────────────────────────────────────────────

export const VISION_SAMPLE_INTERVAL_MS = 10_000;
export const VISION_FORCE_KEEP_MS = 60_000;
export const VISION_SMART_SILENCE_MS = 30_000;
/** Mean absolute difference (0..255) of 16x16 grayscale thumbnails that counts as a scene change. */
export const VISION_SCENE_DIFF_THRESHOLD = 24;
export const VISION_THUMB_SIZE = 16;
export const VISION_FRAME_WIDTH = 640;
export const VISION_MAX_OUTPUT_TOKENS = 400;

// ── Platform-paid model calls (pattern of threads-service TranslationModelClient) ──

export const MODEL_CONNECTOR_CONFIG_PATH = '/api/v1/internal/connectors/config';
export const MODEL_CONFIG_CACHE_MS = 60_000;
export const MODEL_CONFIG_TIMEOUT_MS = 5000;
export const MODEL_CALL_TIMEOUT_MS = 30_000;
export const GEMINI_OPENAI_COMPAT_SUFFIX = '/openai';
export const GEMINI_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const OLLAMA_DEFAULT_BASE_URL = 'https://ollama.com';
export const OLLAMA_CONNECTOR = 'OLLAMA';
export const OPENAI_COMPAT_STYLE = 'OPENAI_COMPAT';
