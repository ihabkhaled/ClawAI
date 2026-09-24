import {
  OPENAI_GPT_IMAGE_MODEL_PREFIX,
  OPENAI_GPT_IMAGE_PRICED_QUALITY,
} from '../constants/image-payg.constants';

/**
 * The quality actually sent to OpenAI. `gpt-image*` is pinned to the tier its
 * per-image price was seeded at; other OpenAI image models (dall-e) keep the
 * caller's choice, because their seeded price is the standard tier and their
 * API rejects the gpt-image quality vocabulary.
 */
export function resolveOpenAiImageQuality(
  model: string,
  requested: string | undefined,
): string | undefined {
  return model.toLowerCase().startsWith(OPENAI_GPT_IMAGE_MODEL_PREFIX)
    ? OPENAI_GPT_IMAGE_PRICED_QUALITY
    : requested;
}
