import { describe, expect, it } from 'vitest';

import { meteredImageModelKey } from '../image-price-key.utility';

// Which ModelCostVersion row a paid image is metered against. The prices live
// in routing-service's seed rows (v7: gpt-image-1@1024x1024 = $0.167,
// gpt-image-1@1024x1536 / @1536x1024 = $0.25; v8: grok-imagine-image = $0.02,
// grok-imagine-image-2.0 = $0.08); this only picks the key.
describe('meteredImageModelKey', () => {
  it('meters a 1024 square gpt-image-1 on the 1024x1024 row', () => {
    expect(meteredImageModelKey('IMAGE_OPENAI', 'gpt-image-1', 1024, 1024)).toBe(
      'gpt-image-1@1024x1024',
    );
  });

  it('meters portrait and landscape on their own sized rows', () => {
    expect(meteredImageModelKey('IMAGE_OPENAI', 'gpt-image-1', 1536, 1024)).toBe(
      'gpt-image-1@1536x1024',
    );
    expect(meteredImageModelKey('IMAGE_OPENAI', 'gpt-image-1', 1024, 1536)).toBe(
      'gpt-image-1@1024x1536',
    );
  });

  it('meters an unknown size on the most expensive row (never under-charge)', () => {
    expect(meteredImageModelKey('IMAGE_OPENAI', 'gpt-image-1', 512, 512)).toBe(
      'gpt-image-1@1536x1024',
    );
    expect(meteredImageModelKey('IMAGE_OPENAI', 'gpt-image-1', 1792, 1024)).toBe(
      'gpt-image-1@1536x1024',
    );
    expect(meteredImageModelKey('IMAGE_OPENAI', 'GPT-IMAGE-1', 1024, 1024)).toBe(
      'gpt-image-1@1024x1024',
    );
  });

  // dall-e-3 by quality (seed v9: dall-e-3@hd = $0.08; base row = standard $0.04).
  it('meters dall-e-3 hd on the @hd row', () => {
    expect(meteredImageModelKey('IMAGE_OPENAI', 'dall-e-3', 1024, 1024, 'hd')).toBe('dall-e-3@hd');
    expect(meteredImageModelKey('IMAGE_OPENAI', 'DALL-E-3', 1024, 1024, 'HD')).toBe('dall-e-3@hd');
  });

  it('meters dall-e-3 standard on the base row', () => {
    expect(meteredImageModelKey('IMAGE_OPENAI', 'dall-e-3', 1024, 1024, 'standard')).toBe(
      'dall-e-3',
    );
  });

  it('meters dall-e-3 at an unknown quality on the dearest (@hd) row', () => {
    expect(meteredImageModelKey('IMAGE_OPENAI', 'dall-e-3', 1024, 1024, 'high')).toBe(
      'dall-e-3@hd',
    );
    expect(meteredImageModelKey('IMAGE_OPENAI', 'dall-e-3', 1024, 1024, 'ultra')).toBe(
      'dall-e-3@hd',
    );
  });

  // The adapter omits an absent/empty quality, and OpenAI's dall-e-3 default is standard.
  it('meters dall-e-3 with no quality on the base (standard) row', () => {
    expect(meteredImageModelKey('IMAGE_OPENAI', 'dall-e-3', 1024, 1024)).toBe('dall-e-3');
    expect(meteredImageModelKey('IMAGE_OPENAI', 'dall-e-3', 1024, 1024, '')).toBe('dall-e-3');
  });

  it('ignores quality for gpt-image-1 (pinned high; priced by size)', () => {
    expect(meteredImageModelKey('IMAGE_OPENAI', 'gpt-image-1', 1024, 1024, 'hd')).toBe(
      'gpt-image-1@1024x1024',
    );
  });

  it('leaves every other model on its own row', () => {
    expect(meteredImageModelKey('IMAGE_OPENAI', 'dall-e-2', 1024, 1024, 'hd')).toBe('dall-e-2');
    expect(meteredImageModelKey('IMAGE_GEMINI', 'gemini-2.5-flash-image', 1536, 1024)).toBe(
      'gemini-2.5-flash-image',
    );
  });

  it('meters a priced Grok image model on its own per-image row, whatever the size', () => {
    expect(meteredImageModelKey('IMAGE_GROK', 'grok-imagine-image', 1536, 1024)).toBe(
      'grok-imagine-image',
    );
    expect(meteredImageModelKey('IMAGE_GROK', 'Grok-Imagine-Image-2.0', 1024, 1024)).toBe(
      'grok-imagine-image-2.0',
    );
  });

  // An unpriced Grok image model would fall to routing's provider fallback
  // (grok-4's TOKEN rate) and settle at $0 — so it takes the dearest Grok row.
  it('meters an unknown Grok image model on the most expensive Grok row', () => {
    expect(meteredImageModelKey('IMAGE_GROK', 'grok-imagine-image-quality', 1024, 1024)).toBe(
      'grok-imagine-image-2.0',
    );
    expect(meteredImageModelKey('IMAGE_GROK', 'grok-imagine-image-3', 1024, 1024)).toBe(
      'grok-imagine-image-2.0',
    );
  });
});
