import { IMAGE_GENERATION_PROMPT_MAX_CHARACTERS } from '../../constants/image-generation.constants';
import { boundImageGenerationPrompt } from '../image-generation-prompt.utility';

describe('boundImageGenerationPrompt', () => {
  it('preserves prompts inside the image-service contract', () => {
    expect(boundImageGenerationPrompt('draw a cat')).toBe('draw a cat');
  });

  it('bounds enriched prompts before the image-service request', () => {
    expect(boundImageGenerationPrompt('x'.repeat(5_000))).toHaveLength(
      IMAGE_GENERATION_PROMPT_MAX_CHARACTERS,
    );
  });
});
