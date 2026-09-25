import { describe, expect, it } from 'vitest';

import { meteredImageModelKey } from '../image-price-key.utility';

// Which ModelCostVersion row a paid image is metered against. The prices live
// in routing-service's seed v7 rows (gpt-image-1@1024x1024 = $0.167,
// gpt-image-1@1024x1536 / @1536x1024 = $0.25); this only picks the key.
describe('meteredImageModelKey', () => {
  it('meters a 1024 square gpt-image-1 on the 1024x1024 row', () => {
    expect(meteredImageModelKey('gpt-image-1', 1024, 1024)).toBe('gpt-image-1@1024x1024');
  });

  it('meters portrait and landscape on their own sized rows', () => {
    expect(meteredImageModelKey('gpt-image-1', 1536, 1024)).toBe('gpt-image-1@1536x1024');
    expect(meteredImageModelKey('gpt-image-1', 1024, 1536)).toBe('gpt-image-1@1024x1536');
  });

  it('meters an unknown size on the most expensive row (never under-charge)', () => {
    expect(meteredImageModelKey('gpt-image-1', 512, 512)).toBe('gpt-image-1@1536x1024');
    expect(meteredImageModelKey('gpt-image-1', 1792, 1024)).toBe('gpt-image-1@1536x1024');
    expect(meteredImageModelKey('GPT-IMAGE-1', 1024, 1024)).toBe('gpt-image-1@1024x1024');
  });

  it('leaves every other model on its own row', () => {
    expect(meteredImageModelKey('dall-e-3', 1024, 1024)).toBe('dall-e-3');
    expect(meteredImageModelKey('gemini-2.5-flash-image', 1536, 1024)).toBe(
      'gemini-2.5-flash-image',
    );
  });
});
