import { describe, expect, it } from 'vitest';

import { IMAGE_CAPABILITIES, IMAGE_MODEL_OPTIONS } from '@/constants/image.constants';

// OpenAI retired DALL-E for new API keys; offering it produced
// "The model 'dall-e-3' does not exist" on every pick.
describe('image model options', () => {
  it('never offers a retired DALL-E model', () => {
    const models = [...IMAGE_MODEL_OPTIONS, ...IMAGE_CAPABILITIES].map((o) => o.model);
    expect(models.some((m) => m.startsWith('dall-e'))).toBe(false);
  });

  it("offers OpenAI's current image model, matching image-service", () => {
    expect(IMAGE_MODEL_OPTIONS.find((o) => o.provider === 'IMAGE_OPENAI')?.model).toBe(
      'gpt-image-1',
    );
    expect(IMAGE_CAPABILITIES.find((c) => c.requiresConnector === 'OPENAI')?.model).toBe(
      'gpt-image-1',
    );
  });
});
