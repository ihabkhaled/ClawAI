/**
 * Every `FileDeliveryEntry.reason` chat-service emits, mapped to its
 * localized copy. The backend sends a stable machine key
 * (`file_delivery.reason.*`, from chat-service's
 * `attachment-delivery.constants.ts`); the tooltip used to print that key raw.
 *
 * The left-hand side is the wire value and must match chat-service byte for
 * byte — `file-delivery-reason.constants.test.ts` reads the backend constants
 * file and fails when a key there has no entry here. An unknown reason (a
 * newer backend) renders FILE_DELIVERY_REASON_FALLBACK_KEY, never the raw key.
 */
export const FILE_DELIVERY_REASON_LABEL_KEYS: ReadonlyMap<string, string> = new Map([
  ['file_delivery.reason.no_vision', 'mediaUi.deliveryReason.noVision'],
  ['file_delivery.reason.unsupported_mime', 'mediaUi.deliveryReason.unsupportedMime'],
  ['file_delivery.reason.no_video_input', 'mediaUi.deliveryReason.noVideoInput'],
  ['file_delivery.reason.no_image_bytes', 'mediaUi.deliveryReason.noImageBytes'],
  ['file_delivery.reason.still_processing', 'mediaUi.deliveryReason.stillProcessing'],
  ['file_delivery.reason.failed_processing', 'mediaUi.deliveryReason.failedProcessing'],
  ['file_delivery.reason.truncated', 'mediaUi.deliveryReason.truncated'],
  ['file_delivery.reason.vision_helper_failed', 'mediaUi.deliveryReason.visionHelperFailed'],
  ['file_delivery.reason.vision_helper_refused', 'mediaUi.deliveryReason.visionHelperRefused'],
  ['file_delivery.reason.helper_vision_plan', 'mediaUi.deliveryReason.helperVisionPlan'],
  ['file_delivery.reason.vision_helper_limit', 'mediaUi.deliveryReason.visionHelperLimit'],
  ['file_delivery.reason.video_plan_limit', 'mediaUi.deliveryReason.videoPlanLimit'],
  [
    'file_delivery.reason.video_frames_unavailable',
    'mediaUi.deliveryReason.videoFramesUnavailable',
  ],
  ['file_delivery.reason.video_frames_no_helper', 'mediaUi.deliveryReason.videoFramesNoHelper'],
  ['file_delivery.reason.video_frames_helper_plan', 'mediaUi.deliveryReason.videoFramesHelperPlan'],
]);

export const FILE_DELIVERY_REASON_FALLBACK_KEY = 'mediaUi.deliveryReason.unknown';
