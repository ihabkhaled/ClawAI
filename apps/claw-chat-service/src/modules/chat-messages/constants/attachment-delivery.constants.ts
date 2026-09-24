/**
 * `FileDeliveryEntry.reason` keys — why a file was not delivered whole.
 * The first two predate ADR-120 and are persisted on existing rows; never rename them.
 */
export const DELIVERY_REASON_NO_VISION = 'file_delivery.reason.no_vision';
export const DELIVERY_REASON_UNSUPPORTED_MIME = 'file_delivery.reason.unsupported_mime';
export const DELIVERY_REASON_NO_VIDEO_INPUT = 'file_delivery.reason.no_video_input';
export const DELIVERY_REASON_NO_IMAGE_BYTES = 'file_delivery.reason.no_image_bytes';
export const DELIVERY_REASON_STILL_PROCESSING = 'file_delivery.reason.still_processing';
export const DELIVERY_REASON_FAILED_PROCESSING = 'file_delivery.reason.failed_processing';
export const DELIVERY_REASON_TRUNCATED = 'file_delivery.reason.truncated';

/** Base64 carries 3 bytes in every 4 characters. */
export const BASE64_DECODED_BYTES_PER_CHAR = 0.75;

/**
 * What a lane whose model cannot see images is told. Honest, and useful where
 * possible: OCR text of a screenshot or an invoice usually answers the
 * question. Batch 3 adds a helper-vision description in front of this.
 */
export const NO_VISION_IMAGE_WITH_OCR_FRAME =
  'The user attached an image this model cannot view directly. Text extracted from it (OCR):';
export const NO_VISION_IMAGE_WITHOUT_TEXT_NOTE =
  'The user attached an image this model cannot view directly, and no text could be read from it. Tell the user you cannot see this image; do not guess at what it shows.';

/** A video the lane cannot watch, until batch 6 adds frames + a transcript. */
export const UNSUPPORTED_VIDEO_NOTE =
  'The user attached a video this model cannot watch, and no transcript of it is available. Tell the user you could not see or hear it; do not describe its contents.';
