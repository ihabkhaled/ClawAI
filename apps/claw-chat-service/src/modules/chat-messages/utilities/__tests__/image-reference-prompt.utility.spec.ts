import {
  IMAGE_REFERENCE_DESCRIPTION_PREFIX,
  IMAGE_REFERENCE_INSTRUCTION_PREFIX,
} from '../../constants/image-generation.constants';
import { buildReferenceImagePrompt } from '../image-reference-prompt.utility';

describe('buildReferenceImagePrompt (pack §79)', () => {
  it('puts the user instruction first, verbatim, and the description after it', () => {
    expect(buildReferenceImagePrompt('add a hat', 'A tabby cat on a sofa.')).toBe(
      `${IMAGE_REFERENCE_INSTRUCTION_PREFIX}add a hat\n\n${IMAGE_REFERENCE_DESCRIPTION_PREFIX}A tabby cat on a sofa.`,
    );
  });

  it.each([
    ['the rewrite returned the user text (failure)', 'add a hat'],
    ['the rewrite came back empty', '   '],
  ])('returns the original prompt when %s', (_label, description) => {
    expect(buildReferenceImagePrompt('add a hat', description)).toBe('add a hat');
  });
});
