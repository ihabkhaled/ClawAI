import { IMAGE_PROVIDER_GROK } from '../../../common/constants';
import { DallE3Quality } from '../../../common/enums';
import {
  GROK_IMAGE_WORST_CASE_MODEL,
  GROK_PER_IMAGE_PRICED_MODELS,
  OPENAI_GPT_IMAGE_PRICED_SIZES,
  OPENAI_GPT_IMAGE_WORST_CASE_SIZE,
  OPENAI_QUALITY_PRICED_IMAGE_MODEL,
  OPENAI_SIZE_PRICED_IMAGE_MODELS,
  SIZED_PRICE_KEY_SEPARATOR,
} from '../constants/image-payg.constants';

/**
 * The `dall-e-3` price row for the quality the call is sent at.
 *
 * - `standard` → the base `dall-e-3` row.
 * - `hd` → `dall-e-3@hd` (seed v9).
 * - Absent (undefined or empty) → the base row. `generateWithOpenAI` sends
 *   `quality` only when it is truthy, so an absent quality is OMITTED from the
 *   request, and OpenAI's default for dall-e-3 is `standard`.
 * - Any other value → `dall-e-3@hd`, the dearest row. Never under-charge a
 *   quality this service did not expect.
 */
function dallE3PriceKey(model: string, quality: string | undefined): string {
  if (!quality) {
    return model;
  }
  return quality.toLowerCase() === DallE3Quality.STANDARD
    ? model
    : `${model}${SIZED_PRICE_KEY_SEPARATOR}${DallE3Quality.HD}`;
}

/**
 * The model key a paid image call is METERED against (the `model` sent to
 * `reserve`; auth-service settles the finalize on the same reservation, so on
 * the same row). The provider call itself always uses the real model id.
 *
 * - A size-priced model (`gpt-image-1`) → `gpt-image-1@<width>x<height>` for a
 *   priced size, else `gpt-image-1@<worst-case size>` (never under-charge).
 * - `dall-e-3` → by quality: `standard`/absent → `dall-e-3`, `hd` or an
 *   unknown value → `dall-e-3@hd` (seed v9).
 * - A Grok image model (`IMAGE_GROK`) → its own per-image row when it has one,
 *   else the dearest Grok image row (seed v8) — never the provider fallback,
 *   which would price it by grok-4's tokens and settle at $0.
 * - Every other model → unchanged (Gemini is token-priced; dall-e-2 keeps its row).
 */
export function meteredImageModelKey(
  provider: string,
  model: string,
  width: number,
  height: number,
  quality?: string,
): string {
  const normalized = model.toLowerCase();
  if (provider === IMAGE_PROVIDER_GROK) {
    return GROK_PER_IMAGE_PRICED_MODELS.includes(normalized)
      ? normalized
      : GROK_IMAGE_WORST_CASE_MODEL;
  }
  if (normalized === OPENAI_QUALITY_PRICED_IMAGE_MODEL) {
    return dallE3PriceKey(normalized, quality);
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
