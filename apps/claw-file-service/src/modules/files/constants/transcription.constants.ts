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

export const TRANSCRIPTION_NO_CAPABLE_CONNECTOR_MESSAGE =
  'Audio transcription is unavailable: no connector with an audio-capable model is configured. Ask an administrator to enable one.';

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
