import {
  GROK_VIDEO_WORST_CASE_PRICE_KEY,
  SEEDED_VIDEO_PRICE_KEYS,
  VEO_WORST_CASE_PRICE_KEY,
} from '../constants/video-generation.constants';

/**
 * The model id the routing seed prices video by: the bare id, without Gemini's
 * `models/` catalog prefix (routing strips the same prefix when it discovers
 * models, so both spellings must meter identically).
 */
export function videoPriceKey(model: string): string {
  return model.trim().replace(/^models\//u, '');
}

/**
 * The row a video call is METERED against. A seeded id meters on itself; an id of a
 * known family without a row (`veo-3.1-generate`, `veo-4`, `grok-imagine-video-2`)
 * meters on that family's dearest row, so it is neither refused as unpriced nor
 * under-billed. Anything outside both families is returned unchanged and is refused
 * by the wallet (PAYG_MODEL_UNPRICED) — never guessed.
 */
export function meteredVideoModelKey(model: string): string {
  const key = videoPriceKey(model);
  const lower = key.toLowerCase();
  if (SEEDED_VIDEO_PRICE_KEYS.includes(lower)) {
    return lower;
  }
  if (lower.startsWith('veo-')) {
    return VEO_WORST_CASE_PRICE_KEY;
  }
  return lower.startsWith('grok-imagine-video') ? GROK_VIDEO_WORST_CASE_PRICE_KEY : key;
}
