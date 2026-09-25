// B6b — audio transcription constants.
//
// Declaration ownership (rules/12): nothing in here may be declared inline in a
// manager, client or adapter.

/**
 * Which connector provider gets asked first when more than one has an
 * audio-capable model configured.
 *
 * Order is quality-then-cost, not alphabetical: Gemini's native
 * `generateContent` accepts the audio inline and returns a transcript in one
 * hop, while OpenAI needs a separate Whisper deployment. A provider absent from
 * this list is ignored even if its snapshot row claims audio support — we ship
 * an adapter for exactly these two, and guessing at a third is how a "capable"
 * routing decision turns into a 404 the user reads as "transcription is broken".
 */
export const TRANSCRIPTION_PROVIDER_PRIORITY: readonly string[] = ['GEMINI', 'OPENAI'];

/** The modality string connector-service puts in `modalitiesIn` for audio. */
export const TRANSCRIPTION_AUDIO_MODALITY = 'AUDIO';

/**
 * OpenAI's snapshot rows are CHAT models; none of them is the transcription
 * deployment. The capability lookup proves OpenAI is configured and reachable,
 * this constant names the endpoint's actual model.
 */
export const OPENAI_TRANSCRIPTION_MODEL = 'whisper-1';

export const OPENAI_TRANSCRIPTION_DEFAULT_BASE_URL = 'https://api.openai.com/v1';
export const GEMINI_TRANSCRIPTION_DEFAULT_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta';

/**
 * connector-service stores Gemini's base URL as the OpenAI-COMPATIBLE endpoint
 * (`.../v1beta/openai`), because that is what chat execution speaks. The
 * `:generateContent` route that accepts `inline_data` lives one level up, so the
 * adapter strips this suffix before building its URL.
 */
export const GEMINI_OPENAI_COMPAT_SUFFIX = '/openai';

/** Verbatim, no commentary — the model must not summarise the recording. */
export const TRANSCRIPTION_INSTRUCTION =
  'Transcribe the attached audio verbatim. Output only the spoken words as plain text, with no commentary, no summary, no timestamps and no speaker labels. If the audio contains no speech, output nothing.';

export const TRANSCRIPTION_CONNECTOR_TIMEOUT_MS = 10_000;
export const TRANSCRIPTION_PROVIDER_TIMEOUT_MS = 120_000;

/**
 * Short on purpose. The snapshot changes when an admin adds or exposes a
 * connector, and a job that runs a minute after that change should see it; the
 * cache exists to stop a batch of uploads hammering connector-service, not to
 * hold an answer across an operator's afternoon.
 */
export const TRANSCRIPTION_CAPABILITY_CACHE_TTL_MS = 60_000;

/**
 * Prefix of the placeholder `FileProcessingManager` writes for an audio upload.
 * Used in two directions: to BUILD it there, and to RECOGNISE it here, so a row
 * still carrying the placeholder is not mistaken for an already-transcribed one.
 *
 * claw-chat-service needs this exact literal too (`ContextAssemblyManager`'s
 * "still being transcribed" framing) and keeps its own copy — a shared-package
 * export was tried and reverted: touching `@claw/shared-constants` marks EVERY
 * service "affected" for the pre-commit gate, which then requires a generated
 * Prisma client for all 18 of them. A one-line string literal is not worth
 * that fan-out; the two copies are each covered by a test that pins the exact
 * value (`transcription.manager.spec.ts` here,
 * `context-assembly-attachments.spec.ts` in chat-service), so a future edit to
 * either format breaks a test rather than silently drifting.
 */
export const AUDIO_PLACEHOLDER_PREFIX = '[Audio file: ';

/**
 * How many models of ONE provider the walk may offer. Two, so a single wrong
 * catalog row costs one refused call and not the whole job; not more, because
 * a provider that refuses two stable models is not going to accept a third.
 */
export const TRANSCRIPTION_MAX_CANDIDATES_PER_PROVIDER = 2;

/**
 * Providers whose snapshot row only proves "configured": the model actually
 * called is fixed (`OPENAI_TRANSCRIPTION_MODEL`), so a second row would be the
 * same call twice, and the row's own name says nothing about stability.
 */
export const TRANSCRIPTION_FIXED_MODEL_PROVIDERS: readonly string[] = ['OPENAI'];

/**
 * Model-key fragments that mark a row as NOT a plain transcription model:
 * preview/experimental releases, other product lines that share the Gemini
 * catalog (image, video, music, embeddings, agents), speech OUTPUT and
 * live/realtime dialog models. Matched case-insensitively on the key.
 *
 * Prod 2026-09-25: `models/antigravity-preview-05-2026` was the snapshot's
 * first GEMINI audio row, Gemini answered every voice note with a 400, and no
 * stable model was ever tried. Such rows are used only when NO stable
 * candidate exists at all.
 */
export const TRANSCRIPTION_UNSTABLE_MODEL_MARKERS: readonly string[] = [
  'preview',
  'exp',
  'antigravity',
  'thinking',
  'live',
  'realtime',
  'native-audio',
  'tts',
  'image',
  'veo',
  'lyria',
  'embedding',
  'gemma',
  'aqa',
  'robotics',
  'computer-use',
  'deep-research',
  'nano-banana',
];

/**
 * Preference inside one provider, best first: the cheapest GA tier that hears
 * audio well, then its bigger sibling. Anything matching neither ranks after.
 * `flash-lite` must precede `flash` — every flash-lite key also contains flash.
 */
export const TRANSCRIPTION_PREFERRED_MODEL_FAMILIES: readonly string[] = ['flash-lite', 'flash'];

/** Exposure value of a row an admin turned on for users; preferred within a rank. */
export const TRANSCRIPTION_EXPOSED_EXPOSURE = 'EXPOSED';

export const TRANSCRIPTION_MODELS_PREFIX = 'models/';

/**
 * Hard ceiling on provider calls for ONE job, retries included. A 429 or a
 * refused model moves the walk on; this is what keeps "move on" from becoming
 * a loop. Three candidates (two per provider at most) plus one backoff retry.
 */
export const TRANSCRIPTION_MAX_PROVIDER_CALLS = 4;

/** Calls one candidate may take: the first, plus one retry after a transient 429. */
export const TRANSCRIPTION_CALLS_PER_CANDIDATE = 2;

/** The single short pause before retrying a transient 429. Once per job, never per provider. */
export const TRANSCRIPTION_RATE_LIMIT_BACKOFF_MS = 2_000;

/** HTTP statuses the failure classifier reads off the provider response. */
export const TRANSCRIPTION_HTTP_STATUS_NOT_FOUND = 404;
export const TRANSCRIPTION_HTTP_STATUS_TOO_MANY_REQUESTS = 429;

/**
 * OpenAI's marker for "this key has no credit left". A 429 carrying it is not
 * a rate limit and waiting will not fix it (`error.code` / `error.type`).
 */
export const TRANSCRIPTION_QUOTA_EXHAUSTED_CODES: readonly string[] = ['insufficient_quota'];

/** Thrown by the manager when a provider answers with whitespace. */
export const TRANSCRIPTION_EMPTY_TRANSCRIPT_ERROR = 'The provider returned an empty transcript.';

// ---- What the USER is told ----
// Stored in `extractionError` and relayed by chat-service to the model, which
// answers in the user's language. Never a raw transport string: the old
// "Audio transcription failed: Request failed with status code 429" reached a
// user verbatim on 2026-09-25. The raw reason stays in the log.

/** Every provider we could reach was rate-limited. */
export const TRANSCRIPTION_PROVIDER_BUSY_MESSAGE =
  'The transcription service is busy right now — please try again in a minute.';

/** A provider's account is out of quota; retrying soon will not help. */
export const TRANSCRIPTION_PROVIDER_UNAVAILABLE_MESSAGE =
  'Audio transcription is temporarily unavailable. Please try again later.';

/** Every model tried refused the audio — a catalog problem for an administrator. */
export const TRANSCRIPTION_NO_USABLE_MODEL_MESSAGE =
  'Audio transcription is unavailable: none of the configured models accepted this recording. Ask an administrator to check the transcription connectors.';

/** Any other provider failure. */
export const TRANSCRIPTION_PROVIDER_FAILED_MESSAGE =
  'Audio transcription failed because the transcription service returned an error. Please try again later.';

export const TRANSCRIPTION_NO_CAPABLE_CONNECTOR_MESSAGE =
  'Audio transcription is unavailable: no connector with an audio-capable model is configured. Ask an administrator to enable one.';

/**
 * Phrases a provider uses to say "this exact model does not accept audio",
 * as opposed to a transport failure, rate limit or auth problem. Matched
 * case-insensitively against the provider's own error body (see
 * `extractTranscriptionErrorMessage`), never against the generic axios
 * transport message ("Request failed with status code 400"), which carries
 * none of this.
 *
 * This is what lets `TranscriptionManager` fall through to the next
 * candidate in `TRANSCRIPTION_PROVIDER_PRIORITY` instead of recording a
 * hard failure: a model-catalog mismatch (a row wrongly marked
 * `supportsAudio: true`) is recoverable by trying the next provider: a
 * genuine provider outage or a bad recording is not, and must still fail.
 */
export const TRANSCRIPTION_MODALITY_REJECTION_MARKERS: readonly string[] = [
  'modality is not enabled',
  'audio input modality',
];

/**
 * The most audio one job will send to a provider.
 *
 * Twelve megabytes, which is roughly 25 minutes of the Opus a browser records
 * by default and about 12 minutes of a 128 kbps MP3.
 *
 * This is a COST limit, not a storage one. The upload cap is 50MB measured in
 * bytes, and compressed speech is small: 50MB is something like four hours of
 * voice, and four hours of audio is four hours of transcription billed to the
 * account that dropped one file in. Nothing else in the pipeline would have
 * noticed — the upload succeeds, the job succeeds, and the bill arrives later.
 *
 * A byte ceiling is an approximation of the duration ceiling we actually want.
 * Measuring duration means decoding the container for every format we accept,
 * which is a real dependency for a guard whose job is to refuse obvious abuse;
 * bytes are the honest 80% until that is worth doing. The in-browser recorder
 * already caps itself at five minutes, so this is about UPLOADED files.
 */
export const MAX_TRANSCRIBABLE_AUDIO_BYTES = 12 * 1024 * 1024;

export const TRANSCRIPTION_TOO_LARGE_MESSAGE =
  'This recording is too long to transcribe automatically. Upload a shorter clip, or split it into parts.';
