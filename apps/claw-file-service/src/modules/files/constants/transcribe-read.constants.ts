// Stateless, BILLED media read: POST /files/transcribe-text (owner decision
// 2026-11-02: audio and video reads are billed to the caller).
//
// DESIGN RECORD (reversible; nothing here is persisted, no event is published):
//  - Providers: the EXISTING ranked walk, unchanged (TranscriptionManager
//    #runCandidates over TranscriptionCapabilityClient#findCapableModels:
//    GEMINI then OPENAI, the free LOCAL container last, <= 4 provider calls).
//  - Billing: TranscriptionMeterManager reserve -> call -> finalize on measured
//    units, release on failure, booked to PaygSurface.TRANSCRIPTION_READ with
//    requestId `transcription-read:${userId}:${uuid}:${provider}[:n]`.
//  - Rule 46 (token windows): a read is NOT counted against the day/week/month
//    token windows. Those windows are enforced by chat-service on chat tokens;
//    file-service never touches them, and an attachment's transcription is
//    PAYG-credit only. A read follows the attachment path exactly: credit is the
//    only allowance, and per-unit surfaces are never free-allowance eligible
//    (rule 37 item 22).
//  - Video: the transcript of the AUDIO TRACK ONLY (no frames, no vision cost).
//  - Audio duration is not capped beyond the 12 MB byte cap (the hold is bounded
//    at 7,200 s by TRANSCRIPTION_PAYG_MAX_AUDIO_SECONDS).

/** Audio extensions the read accepts, mapped to the mime type sent to the provider. */
export const TRANSCRIBE_READ_AUDIO_MIME_BY_EXTENSION: Readonly<Record<string, string>> =
  Object.freeze({
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
    webm: 'audio/webm',
  });

/** Video extensions the read accepts (the audio track is extracted with ffmpeg). */
export const TRANSCRIBE_READ_VIDEO_EXTENSIONS: readonly string[] = Object.freeze([
  'mp4',
  'mov',
  'webm',
  'mkv',
]);

/**
 * `.webm` is both. An audio mime type (`audio/webm`) makes it audio; anything
 * else (video/webm, no mime) makes it video, whose track extraction also works
 * on an audio-only container.
 */
export const TRANSCRIBE_READ_AMBIGUOUS_EXTENSION = 'webm';

/** Mime prefixes a supplied `mimeType` may carry; anything else is unsupported. */
export const TRANSCRIBE_READ_MIME_PREFIXES: readonly string[] = Object.freeze(['audio/', 'video/']);

/** Sent by clients that do not know the type; accepted, then the extension decides. */
export const TRANSCRIBE_READ_GENERIC_MIME = 'application/octet-stream';

/** A video longer than this is refused whatever the plan says (30 minutes). */
export const TRANSCRIBE_READ_MAX_VIDEO_SECONDS = 1800;

/** Longest transcript returned; a longer one is cut and `truncated` is true. */
export const TRANSCRIBE_READ_MAX_TEXT_CHARS = 200_000;

export const TRANSCRIBE_READ_UNSUPPORTED_MESSAGE =
  'transcribe-text reads mp3, m4a, wav, ogg, flac, aac and webm audio, and mp4, mov, webm and mkv video.';
export const TRANSCRIBE_READ_EMPTY_MESSAGE = 'contentBase64 decoded to no bytes.';
export const TRANSCRIBE_READ_AUDIO_TOO_LARGE_MESSAGE =
  'This audio file is over the 12 MB limit for a read. Send a shorter clip.';
export const TRANSCRIBE_READ_UNREADABLE_MESSAGE =
  'The media file could not be read. It may be corrupt or not a supported container.';
export const TRANSCRIBE_READ_NO_AUDIO_TRACK_MESSAGE = 'This video has no audio track to read.';
export const TRANSCRIBE_READ_NO_SPEECH_MESSAGE = 'No speech was detected in the audio.';
export const TRANSCRIBE_READ_EXTRACTION_FAILED_MESSAGE =
  'The audio track could not be extracted from this video.';
export const TRANSCRIBE_READ_VIDEO_DISABLED_MESSAGE =
  'Your plan does not include video. Upgrade to read video files.';
export const TRANSCRIBE_READ_ENTITLEMENTS_UNAVAILABLE_MESSAGE =
  'Your plan limit could not be checked right now. Try again later.';
export const TRANSCRIBE_READ_TOOL_UNAVAILABLE_MESSAGE =
  'Video reading is temporarily unavailable on this server.';
export const TRANSCRIBE_READ_UNAVAILABLE_MESSAGE =
  'No transcription provider is available right now. Try again later.';
export const TRANSCRIBE_READ_TRUNCATION_NOTE = '\n[Transcript cut: it was longer than the limit.]';

/** Message for a video over the cap; the number is the effective limit in seconds. */
export function transcribeReadTooLongMessage(limitSeconds: number): string {
  return `This video is longer than the ${String(limitSeconds)} second limit for a read.`;
}

/**
 * Video codecs that are really cover art (an mp3 or m4a with artwork). A file named
 * as audio whose container holds any OTHER video stream is video and goes through
 * the plan's video gate, so renaming a clip to .mp3 cannot skip it.
 */
export const TRANSCRIBE_READ_STILL_IMAGE_CODECS: readonly string[] = [
  'mjpeg',
  'png',
  'bmp',
  'gif',
  'tiff',
  'webp',
  'jpeg2000',
];
