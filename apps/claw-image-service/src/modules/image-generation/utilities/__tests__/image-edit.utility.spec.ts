import { BusinessException } from '../../../../common/errors';
import { type ExecuteImageInput } from '../../types/image-generation.types';
import { assertImageEditSupported, imageExecutionModel } from '../image-edit.utility';

const input = (overrides: Partial<ExecuteImageInput>): ExecuteImageInput => ({
  prompt: 'add a hat',
  provider: 'IMAGE_OPENAI',
  model: 'gpt-image-1',
  userId: 'user-1',
  requestId: 'req-1',
  ...overrides,
});

const codeOf = (params: ExecuteImageInput): string | undefined => {
  try {
    assertImageEditSupported(params);
    return undefined;
  } catch (error: unknown) {
    return error instanceof BusinessException ? error.code : 'UNEXPECTED';
  }
};

describe('assertImageEditSupported', () => {
  it.each([
    ['IMAGE_GEMINI', undefined],
    ['IMAGE_OPENAI', undefined],
    ['IMAGE_LOCAL', undefined],
    ['IMAGE_GROK', 'IMAGE_EDIT_UNAVAILABLE'],
    ['IMAGE_LOCAL_COMFYUI', 'IMAGE_EDIT_UNAVAILABLE'],
  ])('a reference image on %s → %s', (provider, expected) => {
    expect(codeOf(input({ provider, referenceImageBase64: 'aW1n' }))).toBe(expected);
  });

  it('lets a text-only generation through on any provider', () => {
    expect(codeOf(input({ provider: 'IMAGE_GROK' }))).toBeUndefined();
  });

  it('refuses a mask on a provider that cannot apply one', () => {
    expect(
      codeOf(
        input({ provider: 'IMAGE_GEMINI', referenceImageBase64: 'aW1n', maskImageBase64: 'bQ==' }),
      ),
    ).toBe('IMAGE_MASK_NOT_SUPPORTED');
    expect(
      codeOf(
        input({ provider: 'IMAGE_OPENAI', referenceImageBase64: 'aW1n', maskImageBase64: 'bQ==' }),
      ),
    ).toBeUndefined();
  });
});

describe('imageExecutionModel', () => {
  it('moves a dall-e-3 edit to gpt-image-1 and keeps everything else', () => {
    expect(imageExecutionModel(input({ model: 'dall-e-3', referenceImageBase64: 'aW1n' }))).toBe(
      'gpt-image-1',
    );
    expect(imageExecutionModel(input({ model: 'dall-e-3' }))).toBe('dall-e-3');
    expect(
      imageExecutionModel(input({ model: 'gpt-image-1-mini', referenceImageBase64: 'aW1n' })),
    ).toBe('gpt-image-1-mini');
  });
});
