/**
 * The media-generation models (image, video, speech, music) that routing-service's cost
 * seed prices, by connector provider. These are exposed to users by policy (connector-service
 * sync and migration `20261031150000_expose_priced_media_models`): a priced model carries a
 * cost class, so plan limits apply, and an unpriced one is refused at the hold, so it must
 * stay hidden. A routing-service spec keeps this list equal to the seed (v15 and later).
 *
 * Add a model here in the SAME change that seeds its price. Aggregator providers
 * (OpenRouter, Hugging Face, ...) are never listed: their ids are priced one by one.
 */
export const PRICED_MEDIA_MODEL_KEYS_BY_PROVIDER: ReadonlyMap<
  string,
  ReadonlySet<string>
> = new Map([
  [
    'GEMINI',
    new Set([
      'gemini-2.5-flash-image',
      'gemini-3.1-flash-image-preview',
      'gemini-3.1-flash-image',
      'gemini-3-pro-image-preview',
      'gemini-3-pro-image',
      'gemini-3.1-flash-lite-image',
      'nano-banana-pro-preview',
      'veo-3.1-lite-generate-preview',
      'veo-3.1-fast-generate-preview',
      'veo-3.1-generate-preview',
      'veo-3.1-lite',
      'veo-3.1-fast',
      'veo-3.1-generate',
      'gemini-omni-1.1-flash',
      'gemini-2.5-flash-preview-tts',
      'gemini-2.5-pro-preview-tts',
      'gemini-3.1-flash-tts-preview',
      'lyria-3-clip-preview',
      'lyria-3-pro-preview',
      'lyria-3.5',
    ]),
  ],
  [
    'OPENAI',
    new Set([
      'dall-e-2',
      'dall-e-3',
      'gpt-image-1',
      'gpt-image-1-mini',
      'gpt-image-1.5',
      'gpt-image-2',
      'chatgpt-image-latest',
      'tts-1',
      'tts-1-hd',
      'gpt-4o-mini-tts',
    ]),
  ],
  [
    'GROK',
    new Set([
      'grok-imagine-image',
      'grok-imagine-image-quality',
      'grok-imagine-image-2.0',
      'grok-imagine-video',
      'grok-imagine-video-1.5',
    ]),
  ],
]);

/**
 * Models the provider has SHUT DOWN (https://ai.google.dev/gemini-api/docs/deprecations, read
 * 2026-11-01): Veo 3.1 on 2026-10-22 (replacement gemini-omni-1.1-flash), the Gemini 3.x image
 * previews on 2026-06-25. They keep a price row for old receipts but are never priced-and-exposed
 * again, and a sync that no longer lists them lets them go REMOVED.
 */
export const RETIRED_MEDIA_MODEL_KEYS_BY_PROVIDER: ReadonlyMap<
  string,
  ReadonlySet<string>
> = new Map([
  [
    'GEMINI',
    new Set([
      'veo-3.1-lite-generate-preview',
      'veo-3.1-fast-generate-preview',
      'veo-3.1-generate-preview',
      'veo-3.1-lite',
      'veo-3.1-fast',
      'veo-3.1-generate',
      'gemini-3.1-flash-image-preview',
      'gemini-3-pro-image-preview',
    ]),
  ],
]);
