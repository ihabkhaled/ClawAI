/** Google Cloud Vision annotate endpoint. */
export const CLOUD_VISION_ANNOTATE_URL = 'https://vision.googleapis.com/v1/images:annotate';

/** SafeSearch is the only feature requested; nothing else is sent or stored. */
export const CLOUD_VISION_SAFE_SEARCH_FEATURE = 'SAFE_SEARCH_DETECTION';

/** A scan is a network hop per image, run off the publish path. */
export const IMAGE_SAFETY_SCAN_TIMEOUT_MS = 15_000;

/**
 * Likelihoods that disqualify an image from carrying advertising.
 *
 * Deliberately strict. Cloud Vision reports five levels, and anything from
 * POSSIBLE upward is treated as a rejection rather than only LIKELY and above:
 * the thing being protected is ClawAI's own ad account, where the cost of
 * wrongly approving one image is far higher than the cost of wrongly withholding
 * ads from one share. The share itself stays published and readable either way.
 */
export const DISQUALIFYING_LIKELIHOODS: ReadonlyArray<string> = [
  'POSSIBLE',
  'LIKELY',
  'VERY_LIKELY',
];

/**
 * The SafeSearch categories that matter for ad eligibility.
 *
 * `spoof` and `medical` are excluded on purpose: a doctored photo or a clinical
 * image is not an advertising-policy problem, and rejecting on them would
 * withhold ads from legitimate technical conversations.
 */
export const MODERATED_SAFE_SEARCH_CATEGORIES: ReadonlyArray<string> = [
  'adult',
  'violence',
  'racy',
];
