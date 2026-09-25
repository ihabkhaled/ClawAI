import type { FileDeliveryEntry } from './file-delivery.types';
import type { VideoFrameSet } from './video-delivery.types';
import type { DerivedImageObservation, HelperExecution } from './vision-helper.types';

/**
 * One file's delivery to one lane: the recorded mode, and whether its bytes
 * ride the provider payload natively. The payload builders read `sendNative`,
 * the provenance record reads `mode`, and both come from this one decision —
 * which is what keeps them from disagreeing (rule 42 item 14).
 */
export type AttachmentDeliveryDecision = FileDeliveryEntry & {
  sendNative: boolean;
};

/** Every attachment's decision for a single (provider, model) lane. */
export type AttachmentDeliveryPlan = {
  provider: string;
  model: string;
  decisions: AttachmentDeliveryDecision[];
  /**
   * Helper-vision descriptions for this lane's DERIVED_IMAGE_TEXT decisions,
   * already fitted to the file share of the window (rule 51 item 4). Set only
   * once `VisionHelperManager` has run for the lane.
   */
  derivedImages?: DerivedImageObservation[];
  /** Every helper attempt behind those descriptions (no content). */
  helperExecutions?: HelperExecution[];
  /**
   * Whether this lane's model can see images (catalog answer, with the
   * documented UNKNOWN fallback). Decides whether a video's sampled frames
   * ride the payload or go to the vision helper (multimodal batch 8).
   */
  laneSeesImages?: boolean;
  /**
   * The sampled frames of every VIDEO_FRAMES_AND_TRANSCRIPT video, as THIS
   * lane received them. Set once `VideoDeliveryManager` has run for the lane.
   */
  videoFrames?: VideoFrameSet[];
};

export type AttachmentDeliveryOptions = {
  provider: string;
  model: string;
  /**
   * Whether this lane's transport carries video bytes at all. Today only the
   * Gemini native request does (`buildGeminiChatMessages`).
   */
  nativeVideoTransport: boolean;
  /**
   * The uploader's plan limit for video, read for this turn (ADR-122). Native
   * video requires it to be KNOWN and the measured duration inside it; absent
   * or unavailable fails closed — the lane gets the transcript path, never the
   * bytes (multimodal batch 8).
   */
  videoPlan?: VideoPlanGate;
};

/** `maxVideoSeconds` for native delivery: `available: false` = entitlements could not be read. */
export type VideoPlanGate = {
  available: boolean;
  /** `null` unlimited, `0` disabled. Meaningless when `available` is false. */
  limitSeconds: number | null;
};
