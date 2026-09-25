import { type PaygHold } from '@claw/shared-entitlements';

import type { ImageProviderResponse, ImageSettlement } from '../types/image-generation.types';
import { countReturnedImages } from './image-unit-count.utility';

/**
 * What a paid image hold will settle on, measured from the provider response
 * the moment it arrives — and finalized only after the image is persisted
 * (rule 37 item 17).
 *
 * Two signals, and the rate row decides which one carries the cost:
 *  - TOKENS, when the provider reports them. Gemini answers with real
 *    `usageMetadata` and is priced per token (no per-image rate).
 *  - IMAGES RETURNED, always. OpenAI's `/images/generations` reports no usage
 *    at all, so its rows are priced per image (`imagePerUnitMicroUsd`) and
 *    this count is the whole charge. Settling on zero tokens alone is what
 *    used to make every OpenAI image cost $0. xAI Grok reports no tokens
 *    either (only its own `cost_in_usd_ticks`), so it is priced per image too
 *    (routing seed v8); the ticks ride along for the reconciliation log.
 */
export function imageSettlement(hold: PaygHold, response: ImageProviderResponse): ImageSettlement {
  const usage = response.usage;
  return {
    hold,
    usage: {
      promptTokens: usage?.promptTokens ?? 0,
      completionTokens: usage?.completionTokens ?? 0,
      cachedPromptTokens: usage?.cachedPromptTokens ?? 0,
      reasoningTokens: usage?.reasoningTokens ?? 0,
    },
    calls: { toolCalls: 0, imageUnits: countReturnedImages(response) },
    ...(response.providerCostTicks === undefined
      ? {}
      : { providerCostTicks: response.providerCostTicks }),
  };
}
