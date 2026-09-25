/**
 * Why a video upload was not turned into a timestamped document
 * (multimodal batch 7, file-service `VideoProcessingManager`).
 *
 * Every value is a terminal answer recorded on the row with a readable
 * `extractionError`; the upload itself stays stored and downloadable.
 */
export enum VideoProcessingFailureReason {
  /** The container parsed but carries no video stream. */
  NO_VIDEO_STREAM = 'NO_VIDEO_STREAM',
  /** ffprobe reported no duration, or a duration of zero or less. */
  INVALID_DURATION = 'INVALID_DURATION',
  /** width × height above the global pixel cap. */
  DIMENSIONS_TOO_LARGE = 'DIMENSIONS_TOO_LARGE',
  /** Longer than the global duration cap, whatever the plan says. */
  DURATION_TOO_LONG = 'DURATION_TOO_LONG',
  /** ffprobe did not answer inside its wall-clock budget. */
  PROBE_TIMEOUT = 'PROBE_TIMEOUT',
  /** ffprobe refused the bytes, or printed something that is not its JSON. */
  CORRUPT_CONTAINER = 'CORRUPT_CONTAINER',
  /** Longer than the uploader's plan `maxVideoSeconds`. No paid step ran. */
  VIDEO_TOO_LONG_FOR_PLAN = 'VIDEO_TOO_LONG_FOR_PLAN',
  /** The uploader's plan has `maxVideoSeconds = 0`. No paid step ran. */
  VIDEO_DISABLED_FOR_PLAN = 'VIDEO_DISABLED_FOR_PLAN',
  /** The stored bytes could not be read back. */
  SOURCE_UNREADABLE = 'SOURCE_UNREADABLE',
  /** ffprobe/ffmpeg is missing from the image, or could not be spawned. */
  TOOL_UNAVAILABLE = 'TOOL_UNAVAILABLE',
  /** The row was deleted before the job ran. */
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  /** Anything unexpected; the recorded message says what. */
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  /**
   * The owner cancelled processing (`POST /files/:id/processing/cancel`).
   * FAILED, never COMPLETED-with-a-note: a COMPLETED row would tell
   * chat-service the document is ready and route the note to a model as
   * content. No PAYG hold is finalized for a cancelled job.
   */
  PROCESSING_CANCELLED = 'PROCESSING_CANCELLED',
}
