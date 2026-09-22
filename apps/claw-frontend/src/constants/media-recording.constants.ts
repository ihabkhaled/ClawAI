// Composer voice / video note recording limits.

/**
 * Hard ceiling on a single composer recording: 5 minutes.
 *
 * The upload limit is 50 MB, which is roughly four hours of Opus audio — and
 * four hours of audio is four hours of transcription, billed, for a control
 * that looks like "hold to say one sentence". A voice note is a sentence or a
 * paragraph; five minutes is already generous for that and bounds the cost of
 * a button left running by accident (a tab left open, a phone in a pocket).
 * The recorder stops itself at this point and keeps what it has, rather than
 * discarding it — the user gets their note, just truncated.
 */
export const MEDIA_RECORDING_MAX_MS = 5 * 60 * 1000;

/** Elapsed-time tick. 250ms so the readout looks live without re-rendering per frame. */
export const MEDIA_RECORDING_TICK_MS = 250;

/**
 * Video constraints. Deliberately modest: a composer video note is a talking
 * head for a model to watch, not footage. 1280x720 keeps the file inside the
 * upload limit for the full 5 minutes on any reasonable codec.
 */
export const MEDIA_RECORDING_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

/** Used only when the recorder reports no mimeType of its own (older WebKit). */
export const MEDIA_RECORDING_FALLBACK_AUDIO_MIME = 'audio/webm';
export const MEDIA_RECORDING_FALLBACK_VIDEO_MIME = 'video/webm';

/** Filename stems. The extension comes from the recorder's real mimeType. */
export const MEDIA_RECORDING_AUDIO_FILENAME_STEM = 'voice-note';
export const MEDIA_RECORDING_VIDEO_FILENAME_STEM = 'video-note';

/** Last-resort extension when a mimeType carries a subtype we cannot map. */
export const MEDIA_RECORDING_FALLBACK_EXTENSION = 'webm';
