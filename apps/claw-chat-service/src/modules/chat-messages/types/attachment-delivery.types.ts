import type { FileDeliveryEntry } from './file-delivery.types';
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
};

export type AttachmentDeliveryOptions = {
  provider: string;
  model: string;
  /**
   * Whether this lane's transport carries video bytes at all. Today only the
   * Gemini native request does (`buildGeminiChatMessages`).
   */
  nativeVideoTransport: boolean;
};
