/**
 * `POST https://api.x.ai/v1/images/generations` request, as documented at
 * https://docs.x.ai/docs/guides/image-generations and verified live on
 * 2026-09-23 against grok-imagine-image, grok-imagine-image-2.0 and
 * grok-imagine-image-quality.
 *
 * `size`, `quality` and `style` are OpenAI parameters xAI does not document, so
 * they are never sent.
 */
export type XaiImageRequest = {
  model: string;
  prompt: string;
  n: number;
  response_format: 'b64_json';
};

export type XaiImageData = {
  b64_json?: string;
  url?: string;
  mime_type?: string;
  revised_prompt?: string;
};

/**
 * The live response: `{ data: [{ b64_json, mime_type: "image/jpeg" }],
 * usage: { cost_in_usd_ticks } }`. The usage block is a price, not tokens.
 */
export type XaiImageResponse = {
  data?: XaiImageData[];
  usage?: { cost_in_usd_ticks?: number };
};
