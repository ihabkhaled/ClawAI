/**
 * `FileDeliveryEntry.reason` keys — why a file was not delivered whole.
 * The first two predate ADR-120 and are persisted on existing rows; never rename them.
 */
export const DELIVERY_REASON_NO_VISION = 'file_delivery.reason.no_vision';
export const DELIVERY_REASON_UNSUPPORTED_MIME = 'file_delivery.reason.unsupported_mime';
/** A video with no native route and no text at all (a row that predates the batch-7 pipeline). */
export const DELIVERY_REASON_NO_VIDEO_INPUT = 'file_delivery.reason.no_video_input';
export const DELIVERY_REASON_NO_IMAGE_BYTES = 'file_delivery.reason.no_image_bytes';
export const DELIVERY_REASON_STILL_PROCESSING = 'file_delivery.reason.still_processing';
export const DELIVERY_REASON_FAILED_PROCESSING = 'file_delivery.reason.failed_processing';
export const DELIVERY_REASON_TRUNCATED = 'file_delivery.reason.truncated';
/** A no-vision image whose helper description failed; the lane got OCR + the honest note. */
export const DELIVERY_REASON_VISION_HELPER_FAILED = 'file_delivery.reason.vision_helper_failed';
/** The helper call was refused for credit (rule 37 item 18); no second helper was tried. */
export const DELIVERY_REASON_VISION_HELPER_REFUSED = 'file_delivery.reason.vision_helper_refused';
/**
 * The plan does not include helper vision (ADR-122): the lane got OCR + the
 * honest note, and no helper was called or held for.
 */
export const DELIVERY_REASON_HELPER_VISION_PLAN = 'file_delivery.reason.helper_vision_plan';
/** Past the per-turn image cap (`VISION_HELPER_MAX_IMAGES_PER_TURN`); not described. */
export const DELIVERY_REASON_VISION_HELPER_LIMIT = 'file_delivery.reason.vision_helper_limit';

/**
 * Multimodal batch 8 — video. The plan refused to process this video
 * (`VIDEO_TOO_LONG_FOR_PLAN` / `VIDEO_DISABLED_FOR_PLAN`); the lane was told
 * the reason, and native delivery is refused too — a plan limit is not
 * bypassed by picking a model that watches video.
 */
export const DELIVERY_REASON_VIDEO_PLAN_LIMIT = 'file_delivery.reason.video_plan_limit';
/** The frames endpoint failed or the duration is unknown: transcript only. */
export const DELIVERY_REASON_VIDEO_FRAMES_UNAVAILABLE =
  'file_delivery.reason.video_frames_unavailable';
/** A blind lane, and no vision helper could describe the frames: transcript only. */
export const DELIVERY_REASON_VIDEO_FRAMES_NO_HELPER = 'file_delivery.reason.video_frames_no_helper';
/** A blind lane on a plan without helper vision (ADR-122): transcript only. */
export const DELIVERY_REASON_VIDEO_FRAMES_HELPER_PLAN =
  'file_delivery.reason.video_frames_helper_plan';

/** Base64 carries 3 bytes in every 4 characters. */
export const BASE64_DECODED_BYTES_PER_CHAR = 0.75;

/**
 * What a lane whose model cannot see images is told. Honest, and useful where
 * possible: OCR text of a screenshot or an invoice usually answers the
 * question. Batch 5's helper vision replaces it with a described image (DERIVED_IMAGE_TEXT).
 */
export const NO_VISION_IMAGE_WITH_OCR_FRAME =
  'The user attached an image this model cannot view directly. Text extracted from it (OCR):';
export const NO_VISION_IMAGE_WITHOUT_TEXT_NOTE =
  'The user attached an image this model cannot view directly, and no text could be read from it. Tell the user you cannot see this image; do not guess at what it shows.';

/**
 * A video that has neither native delivery nor a processed document (a
 * pre-ADR-120 caller with no plan, or a row with no text at all).
 */
export const UNSUPPORTED_VIDEO_NOTE =
  'The user attached a video this model cannot watch, and no transcript of it is available. Tell the user you could not see or hear it; do not describe its contents.';
