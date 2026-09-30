import { VideoProcessingFailureReason } from '@claw/shared-types';

/**
 * A failed file's `extractionError` is the backend's English sentence, so it is
 * never shown as-is. Its CODE (the video `failureReason` on the row's metadata,
 * or an archive `CODE:` prefix) picks a localized detail; anything else gets
 * the generic one.
 */
export const EXTRACTION_ERROR_GENERIC_KEY = 'mediaUi.attachmentState.failureDetail.generic';

export const EXTRACTION_ERROR_KEY_BY_VIDEO_REASON: ReadonlyMap<string, string> = new Map([
  [
    VideoProcessingFailureReason.NO_VIDEO_STREAM,
    'mediaUi.attachmentState.failureDetail.noVideoStream',
  ],
  [
    VideoProcessingFailureReason.INVALID_DURATION,
    'mediaUi.attachmentState.failureDetail.invalidDuration',
  ],
  [
    VideoProcessingFailureReason.DIMENSIONS_TOO_LARGE,
    'mediaUi.attachmentState.failureDetail.dimensionsTooLarge',
  ],
  [
    VideoProcessingFailureReason.DURATION_TOO_LONG,
    'mediaUi.attachmentState.failureDetail.durationTooLong',
  ],
  [
    VideoProcessingFailureReason.PROBE_TIMEOUT,
    'mediaUi.attachmentState.failureDetail.probeTimeout',
  ],
  [
    VideoProcessingFailureReason.CORRUPT_CONTAINER,
    'mediaUi.attachmentState.failureDetail.corruptContainer',
  ],
  [
    VideoProcessingFailureReason.VIDEO_TOO_LONG_FOR_PLAN,
    'mediaUi.attachmentState.failureDetail.videoTooLongForPlan',
  ],
  [
    VideoProcessingFailureReason.VIDEO_DISABLED_FOR_PLAN,
    'mediaUi.attachmentState.failureDetail.videoDisabledForPlan',
  ],
  [
    VideoProcessingFailureReason.SOURCE_UNREADABLE,
    'mediaUi.attachmentState.failureDetail.sourceUnreadable',
  ],
  [
    VideoProcessingFailureReason.TOOL_UNAVAILABLE,
    'mediaUi.attachmentState.failureDetail.toolUnavailable',
  ],
  [
    VideoProcessingFailureReason.FILE_NOT_FOUND,
    'mediaUi.attachmentState.failureDetail.fileNotFound',
  ],
  [
    VideoProcessingFailureReason.PROCESSING_ERROR,
    'mediaUi.attachmentState.failureDetail.processingError',
  ],
]);
