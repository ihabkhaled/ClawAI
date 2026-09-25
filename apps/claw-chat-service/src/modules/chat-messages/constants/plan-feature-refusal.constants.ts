import { type PlanFeature } from '@claw/shared-entitlements';

/** The plan gate for a chat turn that routes to image generation or edit (ADR-122). */
export const IMAGE_GENERATION_PLAN_FEATURE: PlanFeature = 'allowImageGeneration';

/** The plan gate for describing an image the chat model cannot see (ADR-122). */
export const HELPER_VISION_PLAN_FEATURE: PlanFeature = 'allowHelperVision';

/** The machine code image-service (and every chat gate) answers a locked plan feature with. */
export const PLAN_FEATURE_DISABLED_CODE = 'PLAN_FEATURE_DISABLED';

/** `metadata.type` of an assistant message that is a plan refusal, not an answer. */
export const PLAN_FEATURE_REFUSAL_METADATA_TYPE = 'plan_feature_disabled';

/**
 * Stored as the message text. The frontend replaces it with a translated
 * notice keyed on `metadata.planFeature`; this English line is only what an
 * export or an older client shows.
 */
export const IMAGE_GENERATION_PLAN_REFUSAL_TEXT =
  "Creating and editing images isn't included in your current plan. Upgrade to generate images; you can still attach images and ask about them.";
