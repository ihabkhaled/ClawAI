import { ModelCostClass } from '@claw/shared-types';

/**
 * How many substitutes a MANUAL_MODEL decision carries: chat-service tries at
 * most two of them and offers the rest (up to three) as one-click suggestions
 * when everything failed.
 */
export const PICKED_MODEL_SUBSTITUTE_LIMIT = 5;

/**
 * The eligible pool the substitutes are ranked from. Larger than the AUTO
 * router's prompt list (30) on purpose: that list is round-robin across
 * providers, and the first choice here is ANOTHER model of the SAME provider.
 */
export const PICKED_MODEL_SUBSTITUTE_POOL = 200;

/** Cost classes, cheapest first; the index is the rank. */
export const PICKED_MODEL_COST_CLASS_ORDER: readonly ModelCostClass[] = [
  ModelCostClass.FREE,
  ModelCostClass.CHEAP,
  ModelCostClass.STANDARD,
  ModelCostClass.PREMIUM,
  ModelCostClass.ULTRA,
];

/** Rank used for a model with no published cost class: sorted after known ones. */
export const PICKED_MODEL_UNKNOWN_COST_RANK = PICKED_MODEL_COST_CLASS_ORDER.length;

/** Ordering groups: same provider first, then other providers, then pricier models. */
export const PICKED_MODEL_GROUP_SAME_PROVIDER = 0;
export const PICKED_MODEL_GROUP_OTHER_PROVIDER = 1;
export const PICKED_MODEL_GROUP_COSTLIER = 2;

/**
 * Model ids that are not text-chat models (speech, video, image, embeddings,
 * live/realtime audio, moderation, computer-use, deep research). The catalog
 * still lists some of them as chat models (gemini-2.5-flash-preview-tts,
 * veo-3.1-fast-generate-preview), and a substitute must be able to answer a
 * chat turn. The id is matched on word boundaries (`-`, `/`, `.`, `_`, `:`).
 */
export const PICKED_MODEL_NON_CHAT_ID_PATTERN =
  /(?:^|[^a-z0-9])(?:tts|veo|imagen|embedding|embed|whisper|transcribe|moderation|realtime|native-audio|audio|live|robotics|computer-use|aqa|deep-research|image|dall-e|sora|search-preview)(?:[^a-z0-9]|$)/iu;

/**
 * How many same-provider models the first pass keeps. A provider-wide outage
 * (down, out of credit) makes the rest of them useless, so the list is
 * guaranteed to reach other providers even when one provider has hundreds.
 */
export const PICKED_MODEL_SAME_PROVIDER_SHARE = 2;
