import type { PaygHold } from '@claw/shared-entitlements';
import { TokenUsageSource } from '@claw/shared-types';

import { imageSettlement } from '../image-settlement.utility';

const HOLD: PaygHold = {
  metered: true,
  reservationId: 'res-image-1',
  maxOutputTokens: 8192,
  clamped: false,
  heldMicroUsd: 41_000,
  availableAfterMicroUsd: 959_000,
  reason: null,
};

describe('imageSettlement — measured units captured before the image is persisted', () => {
  it('settles an OpenAI image on the one image returned, zero tokens', () => {
    expect(imageSettlement(HOLD, { imageBase64: 'AAA', mimeType: 'image/png' })).toEqual({
      hold: HOLD,
      usage: { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      calls: { toolCalls: 0, imageUnits: 1 },
    });
  });

  it('settles a Gemini image on the tokens it reported plus the image count', () => {
    const settlement = imageSettlement(HOLD, {
      imageBase64: 'AAA',
      mimeType: 'image/png',
      usage: {
        promptTokens: 24,
        completionTokens: 1_310,
        totalTokens: 1_334,
        cachedPromptTokens: 0,
        reasoningTokens: 20,
        estimated: false,
        source: TokenUsageSource.NATIVE,
      },
    });
    expect(settlement.usage).toEqual({
      promptTokens: 24,
      completionTokens: 1_310,
      cachedPromptTokens: 0,
      reasoningTokens: 20,
    });
    expect(settlement.calls).toEqual({ toolCalls: 0, imageUnits: 1 });
  });

  it('counts zero images for an empty response', () => {
    expect(imageSettlement(HOLD, { mimeType: 'image/png' }).calls.imageUnits).toBe(0);
  });
});
