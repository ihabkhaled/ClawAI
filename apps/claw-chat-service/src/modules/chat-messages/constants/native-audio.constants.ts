/**
 * Native audio into a chat model (multimodal pack §13/§22, rule 42 item 22).
 *
 * A voice note reaches a lane as its audio bytes ONLY when the lane's
 * transport carries them (Gemini's native generateContent request, an
 * `inline_data` / `file_data` audio part) AND the connector catalog says the
 * model accepts audio input (SUPPORTED — never UNKNOWN, never a
 * transcription-only model: the catalog narrows Gemini audio to the stable
 * flash/pro family). Every other lane keeps the transcript (`TRANSCRIPT`).
 */

/**
 * Largest decoded recording sent natively. Gemini's inline request limit is
 * 20 MB of request body; base64 inflates by 4/3, so 15 MB of audio is the
 * most that still fits inline (a larger part would go through the Files API,
 * which this path does not need for voice notes). Above it → TRANSCRIPT.
 */
export const NATIVE_AUDIO_MAX_BYTES = 15 * 1024 * 1024;

/**
 * Gemini bills audio input at 32 tokens per second of audio (the same figure
 * file-service's `GEMINI_AUDIO_TOKENS_PER_SECOND` meters transcription on).
 */
export const NATIVE_AUDIO_TOKENS_PER_SECOND = 32;

/**
 * Bytes per second assumed when estimating a recording's length for the
 * window fit — chat-service has no measured duration for an audio file. 16
 * kbps (2,000 B/s) is the low end of real voice-note codecs (browser Opus is
 * 24–128 kbps), so the estimate errs LONG: a note is kept off the native path
 * rather than overflowing the window. Only the fit uses this; billing is the
 * provider's measured `usageMetadata`, never this estimate.
 */
export const NATIVE_AUDIO_FIT_BYTES_PER_SECOND = 2_000;

/**
 * Share of the file share native audio may spend (rule 51 item 4) — the same
 * half the video frames get; the transcript text spends the other half.
 */
export const NATIVE_AUDIO_FILE_SHARE_FRACTION = 0.5;

/** Appended to the voice-note frame when the recording rides the payload too. */
export const NATIVE_AUDIO_WITH_TRANSCRIPT_NOTE =
  'The recording itself is also attached as audio. Listen to it for tone, emotion and emphasis, but take the exact words from this transcription.';

/** The frame for a natively-delivered recording whose transcription is not ready. */
export const NATIVE_AUDIO_TRANSCRIPT_PENDING_NOTE =
  'The recording is attached as audio, but its transcription was not ready yet, so listen to the recording itself. If any part is unclear, say so rather than guessing at the words.';

/** The frame for a natively-delivered recording whose transcription failed. */
export const NATIVE_AUDIO_TRANSCRIPT_FAILED_NOTE =
  'The recording is attached as audio; its transcription failed, so listen to the recording itself. If any part is unclear, say so rather than guessing at the words.';

/**
 * Prompt tokens per second of a natively-sent video, for sizing the PAYG hold
 * only: Gemini samples 1 frame/s at 258 tokens plus 32 audio tokens/s = 290;
 * rounded up. Native video always has a MEASURED duration (rule 42 item 16),
 * so no byte guess is needed. Billing is the provider's measured usage.
 */
export const NATIVE_VIDEO_HOLD_TOKENS_PER_SECOND = 300;
