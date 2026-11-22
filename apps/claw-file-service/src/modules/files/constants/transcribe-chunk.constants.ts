// ADR-221 — platform-paid chunk transcription for Live Intelligence
// (`POST /internal/files/transcribe-chunk`). Declaration ownership: rules/12.
//
// Design record: the route reuses `TranscriptionManager#runCandidates` (the
// ranked, bounded provider walk) with `platformPaid: true`, so NO user wallet
// hold is taken — live-service books viewer charges on its own per-minute
// meter (`PaygSurface.LIVE_INTELLIGENCE`). What the provider call cost the
// platform is ESTIMATED from routing-service's rate card and returned as
// `costMicroUsd`, so live-service can record it once in `LiveProviderCost`.

/** Largest decoded chunk accepted: 2 MiB (≈ 65 s of 16 kHz mono 16-bit WAV). */
export const TRANSCRIBE_CHUNK_MAX_BYTES = 2 * 1024 * 1024;

/** Longest base64 string that can decode to `TRANSCRIBE_CHUNK_MAX_BYTES`. */
export const TRANSCRIBE_CHUNK_MAX_BASE64_LENGTH = Math.ceil(TRANSCRIBE_CHUNK_MAX_BYTES / 3) * 4;

/** Longest chunk accepted, in measured seconds. live-service sends 6 s chunks. */
export const TRANSCRIBE_CHUNK_MAX_SECONDS = 30;

/** Accepted mime types: audio only (`audio/wav`, `audio/webm;codecs=opus`). One class, no nesting. */
export const TRANSCRIBE_CHUNK_MIME_PATTERN = /^audio\/[\w.+=; -]{1,100}$/;

/** Language hint (`en`, `ar`, `pt-BR`): a letter, then letters, digits or dashes. */
export const TRANSCRIBE_CHUNK_LANGUAGE_PATTERN = /^[A-Za-z][A-Za-z0-9-]{1,10}$/;

/** Request-id label prefix: the walk's `fileId`, never a PAYG request id (no hold). */
export const TRANSCRIBE_CHUNK_LABEL_PREFIX = 'live-chunk';

/** The service-scoped "user" of a platform-paid walk; it never names a wallet. */
export const TRANSCRIBE_CHUNK_PLATFORM_PAYER = 'platform:live-intelligence';

/** `GET ${ROUTING_SERVICE_URL}${MODEL_RATE_PATH_PREFIX}/:provider/:model`, Service auth. */
export const MODEL_RATE_PATH_PREFIX = '/api/v1/internal/router-models/costs';

export const MODEL_RATE_TIMEOUT_MS = 2_000;

/** Rates change rarely; a 6 s chunk cadence must not hit routing-service every call. */
export const MODEL_RATE_CACHE_TTL_MS = 300_000;

export const MODEL_RATE_CACHE_MAX_ENTRIES = 64;

export const TRANSCRIBE_CHUNK_EMPTY_MESSAGE = 'The audio chunk is empty.';
export const TRANSCRIBE_CHUNK_TOO_LARGE_MESSAGE = 'The audio chunk is larger than 2 MB.';
export const TRANSCRIBE_CHUNK_TOO_LONG_MESSAGE = 'The audio chunk is longer than 30 seconds.';
export const TRANSCRIBE_CHUNK_FAILED_MESSAGE = 'The audio chunk could not be transcribed.';
export const TRANSCRIBE_CHUNK_UNAVAILABLE_MESSAGE =
  'No speech-to-text provider is available right now.';
