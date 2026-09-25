import { RequiredModality } from '@claw/shared-types';

/**
 * Multimodal batch 8 — what chat-service tells routing-service about a turn's
 * attachments on `message.created`, so AUTO can rank by modality fit
 * (rule 51 item 13).
 */

/** One readiness poll per attachment; past this the turn is routed as if it had none. */
export const ATTACHMENT_LOOKUP_TIMEOUT_MS = 2_000;

/** file-service's cheap per-file readiness endpoint (carries the mime type). */
export const FILE_INGESTION_STATE_PATH =
  '/api/v1/internal/files/{FILE_ID}/ingestion-state?userId={USER_ID}';

/** file-service's content endpoint without the bytes — for the research digest's text only. */
export const FILE_TEXT_ONLY_CONTENT_PATH =
  '/api/v1/internal/files/{FILE_ID}/content?userId={USER_ID}&includeContent=false';

/** Mime prefix → the input a model needs to read it directly. */
export const MIME_PREFIX_MODALITIES: ReadonlyArray<readonly [string, RequiredModality]> = [
  ['image/', RequiredModality.IMAGE_INPUT],
  ['video/', RequiredModality.VIDEO_INPUT],
  ['audio/', RequiredModality.AUDIO_INPUT],
];

/**
 * What chat-service can always turn into text for a model that cannot read it:
 * audio → transcript; video → timestamped transcript (+ frames when a helper
 * or the lane can see). An image is transformable only when the plan includes
 * helper vision (ADR-122) — otherwise a text-only model gets OCR at best.
 */
export const ALWAYS_TRANSFORMABLE_MODALITIES: ReadonlySet<RequiredModality> = new Set([
  RequiredModality.AUDIO_INPUT,
  RequiredModality.VIDEO_INPUT,
]);

/** The research planner sees at most this much of the attachments' derived text. */
export const RESEARCH_ATTACHMENT_DIGEST_MAX_CHARS = 1_500;
/** …and at most this much from any one attachment. */
export const RESEARCH_ATTACHMENT_DIGEST_PER_FILE_CHARS = 600;

/**
 * The digest line for a video file-service is still processing at send time:
 * honest "not yet", never silence (a planner that sees nothing plans as if no
 * video was attached).
 */
export const RESEARCH_DIGEST_VIDEO_PROCESSING_NOTE =
  'video still processing — transcript not yet available';
