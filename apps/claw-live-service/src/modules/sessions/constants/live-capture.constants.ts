import { LiveSessionState } from '../../../generated/prisma';

// ── Browser capture audio route (architecture section 9) ────────────────────

/** Express path of the raw-body audio route (the only route with a raw parser). */
export const LIVE_CAPTURE_AUDIO_ROUTE = '/api/v1/live/sessions/:sessionId/audio';
export const LIVE_CAPTURE_CONTENT_TYPE = 'audio/wav';
/** Largest accepted chunk body: 400 KB (8 s of 16 kHz mono PCM16 is about 256 KB). */
export const LIVE_CAPTURE_MAX_BYTES = 400 * 1024;
/** The same limit in body-parser notation. */
export const LIVE_CAPTURE_BODY_LIMIT = '400kb';
/** Header carrying the chunk's media start time, epoch ms. */
export const LIVE_CAPTURE_START_HEADER = 'x-chunk-start-at';
/** X-Chunk-Start-At must be within this much of server time. */
export const LIVE_CAPTURE_CLOCK_SKEW_MS = 120_000;
/** The header value: a plain non-negative integer of epoch ms. */
export const LIVE_CAPTURE_START_PATTERN = /^\d{1,16}$/u;
/** One chunk per session at most every 3 s (the client sends one every 6 s). */
export const LIVE_CAPTURE_MIN_INTERVAL_MS = 3000;
export const LIVE_CAPTURE_RATE_KEY_PREFIX = 'live:capture-rate:';
export const LIVE_CAPTURE_MIN_DURATION_MS = 1000;
export const LIVE_CAPTURE_MAX_DURATION_MS = 8000;
/**
 * The only session states that accept audio: the ones that accrue billable seconds. An allow-list, so a
 * PAUSED session (heartbeats accrue nothing) cannot push audio for free transcription (security review
 * 2026-11-22), and a future state is refused until someone decides it should bill.
 */
export const LIVE_CAPTURE_ACCEPTING_STATES: readonly LiveSessionState[] = [
  LiveSessionState.ACTIVE,
  LiveSessionState.GRACE,
];
/**
 * Audio is accepted only while the viewer is provably watching: a heartbeat (or the session start) within
 * this window. Accrual stops after 15 s without a heartbeat, so silent uploads would be unbilled.
 */
export const LIVE_CAPTURE_HEARTBEAT_FRESH_MS = 20_000;

// ── WAV header (RIFF, PCM16 mono 16 kHz) ────────────────────────────────────

export const WAV_RIFF_HEADER_BYTES = 12;
export const WAV_CHUNK_HEADER_BYTES = 8;
export const WAV_FORMAT_PCM = 1;
export const WAV_REQUIRED_CHANNELS = 1;
export const WAV_REQUIRED_SAMPLE_RATE = 16_000;
export const WAV_REQUIRED_BITS = 16;
/** PCM16 mono 16 kHz bytes per second. */
export const WAV_BYTES_PER_SECOND = 32_000;
/** Minimum size of a PCM fmt chunk body. */
export const WAV_FMT_MIN_BYTES = 16;
