/**
 * The machine-readable `code` of every refusal from the stateless billed media
 * read (`POST /files/transcribe-text`). The client switches on these, never on
 * the message. Values are the wire contract: do not rename.
 */
export enum TranscribeReadErrorCode {
  /** The base64 decoded to no bytes. */
  EMPTY_MEDIA = 'TRANSCRIBE_READ_EMPTY_MEDIA',
  /** Extension / mimeType is neither a supported audio nor a supported video type. */
  UNSUPPORTED_MEDIA_TYPE = 'TRANSCRIBE_READ_UNSUPPORTED_MEDIA_TYPE',
  /** An audio file over `MAX_TRANSCRIBABLE_AUDIO_BYTES` (12 MB). */
  AUDIO_TOO_LARGE = 'TRANSCRIBE_READ_AUDIO_TOO_LARGE',
  /** A video longer than min(plan maxVideoSeconds, 1800 s). */
  MEDIA_TOO_LONG = 'TRANSCRIBE_READ_MEDIA_TOO_LONG',
  /** The plan has video disabled (`maxVideoSeconds` = 0). */
  VIDEO_DISABLED_FOR_PLAN = 'TRANSCRIBE_READ_VIDEO_DISABLED_FOR_PLAN',
  /** ffprobe could not read the container (corrupt, or not media). */
  MEDIA_UNREADABLE = 'TRANSCRIBE_READ_MEDIA_UNREADABLE',
  /** The video has no audio track: nothing to read, nothing billed. */
  NO_AUDIO_TRACK = 'TRANSCRIBE_READ_NO_AUDIO_TRACK',
  /** ffmpeg could not pull the audio track out. */
  AUDIO_EXTRACTION_FAILED = 'TRANSCRIBE_READ_AUDIO_EXTRACTION_FAILED',
  /** The audio track is silent: no provider call, nothing billed. */
  NO_SPEECH = 'TRANSCRIBE_READ_NO_SPEECH',
  /** The caller's credit cannot cover the read (402). */
  INSUFFICIENT_CREDIT = 'TRANSCRIBE_READ_INSUFFICIENT_CREDIT',
  /** The credit check could not run (503, fails closed). */
  CREDIT_CHECK_UNAVAILABLE = 'TRANSCRIBE_READ_CREDIT_CHECK_UNAVAILABLE',
  /** The plan limit could not be read (503, fails closed for the paid step). */
  ENTITLEMENTS_UNAVAILABLE = 'TRANSCRIBE_READ_ENTITLEMENTS_UNAVAILABLE',
  /** ffmpeg/ffprobe cannot run on this host (503). */
  TOOL_UNAVAILABLE = 'TRANSCRIBE_READ_TOOL_UNAVAILABLE',
  /** No connector can transcribe audio right now (503). */
  UNAVAILABLE = 'TRANSCRIBE_READ_UNAVAILABLE',
  /** Every provider attempt failed or answered empty (502). Holds were released. */
  FAILED = 'TRANSCRIBE_READ_FAILED',
}
