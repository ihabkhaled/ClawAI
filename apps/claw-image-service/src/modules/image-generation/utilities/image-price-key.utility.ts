import { IMAGE_PROVIDER_GROK } from '../../../common/constants';
import {
  GROK_IMAGE_WORST_CASE_MODEL,
  GROK_PER_IMAGE_PRICED_MODELS,
  OPENAI_GPT_IMAGE_PRICED_SIZES,
  OPENAI_GPT_IMAGE_WORST_CASE_SIZE,
  OPENAI_SIZE_PRICED_IMAGE_MODELS,
  SIZED_PRICE_KEY_SEPARATOR,
} from '../constants/image-payg.constants';

/**
 * The model key a paid image call is METERED against (the `model` sent to
 * `reserve`; auth-service settles the finalize on the same reservation, so on
 * the same row). The provider call itself always uses the real model id.
 *
 * - A size-priced model (`gpt-image-1`) → `gpt-image-1@<width>x<height>` for a
 *   priced size, else `gpt-image-1@<worst-case size>` (never under-charge).
 * - A Grok image model (`IMAGE_GROK`) → its own per-image row when it has one,
 *   else the dearest Grok image row (seed v8) — never the provider fallback,
 *   which would price it by grok-4's tokens and settle at $0.
 * - Every other model → unchanged (Gemini is token-priced; dall-e keeps its row).
 */
export function meteredImageModelKey(
  provider: string,
  model: string,
  width: number,
  height: number,
): string {
  const normalized = model.toLowerCase();
  if (provider === IMAGE_PROVIDER_GROK) {
    return GROK_PER_IMAGE_PRICED_MODELS.includes(normalized)
      ? normalized
      : GROK_IMAGE_WORST_CASE_MODEL;
  }
  if (!OPENAI_SIZE_PRICED_IMAGE_MODELS.includes(normalized)) {
    return model;
  }
  const size = `${String(width)}x${String(height)}`;
  const priced = OPENAI_GPT_IMAGE_PRICED_SIZES.includes(size)
    ? size
    : OPENAI_GPT_IMAGE_WORST_CASE_SIZE;
  return `${normalized}${SIZED_PRICE_KEY_SEPARATOR}${priced}`;
}
