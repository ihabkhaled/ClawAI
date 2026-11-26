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

/**
 * The Live chunk instruction (2026-11-24). Gemini reports no language, and every Live caption was
 * stored with `language: null`, so a viewer in the speaker's own language got a "translation" of
 * the same words. The model names the spoken language in a tag on the first line; the tag is
 * stripped before the text is returned. Sung lyrics are words too: a stream of a song must caption.
 * Sung lines start with ♪ (2026-11-26): live-service reads it as "a song" and searches the lyrics.
 */
export const TRANSCRIBE_CHUNK_INSTRUCTION = [
  'Transcribe the attached audio verbatim, in the language and script it is spoken or sung in. Never translate.',
  'Sung lyrics count as speech: transcribe them, and start every sung line with the note sign ♪ so a reader knows it is a song, not speech.',
  'Start the answer with the tag [[lang:xx]] where xx is the ISO 639-1 code of the main spoken language (for example [[lang:ar]], [[lang:en]]), then the words.',
  'Output only the tag and the spoken words as plain text: no commentary, no summary, no timestamps, no speaker labels.',
  'If the audio contains no speech and no singing, output nothing at all.',
].join(' ');

/** The language tag the chunk instruction asks for, anywhere in the answer (a name such as
 * `english` is kept as said; live-service reads codes and names alike). */
export const TRANSCRIBE_CHUNK_LANGUAGE_TAG =
  /\[\[\s*lang\s*:\s*([A-Za-z][A-Za-z0-9-]{1,19})\s*\]\]/giu;

/**
 * A chunk "transcript" with no words: only digits, clock stamps and separators ("00:00 00:01 00:02",
 * seen on music, 2026-11-24), or only note signs. It is not speech and never becomes a caption.
 */
export const TRANSCRIBE_CHUNK_NUMBERS_ONLY = /^[\d\s:.,;\-–—♪]*$/u;

/** One bracketed sound tag ("[Music]", "(applause)"); a chunk made only of these is not speech. */
export const TRANSCRIBE_CHUNK_SOUND_TAG = /[[(][^\])]{1,30}[\])]/gu;
