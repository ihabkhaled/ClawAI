import {
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
 * - Every other model → unchanged (Gemini is token-priced; dall-e keeps its row).
 */
export function meteredImageModelKey(model: string, width: number, height: number): string {
  if (!OPENAI_SIZE_PRICED_IMAGE_MODELS.includes(model.toLowerCase())) {
    return model;
  }
  const size = `${String(width)}x${String(height)}`;
  const priced = OPENAI_GPT_IMAGE_PRICED_SIZES.includes(size)
    ? size
    : OPENAI_GPT_IMAGE_WORST_CASE_SIZE;
  return `${model.toLowerCase()}${SIZED_PRICE_KEY_SEPARATOR}${priced}`;
}
