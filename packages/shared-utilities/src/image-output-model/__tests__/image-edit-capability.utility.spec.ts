import { describe, expect, it } from 'vitest';

import {
  imageEditCapabilityOf,
  imageEditModelFor,
  imageEditProviders,
  supportsImageEdit,
  supportsImageMask,
} from '../image-edit-capability.utility';

describe('image edit capability table', () => {
  it.each([
    ['IMAGE_GEMINI', true, false],
    ['IMAGE_OPENAI', true, true],
    ['IMAGE_LOCAL', true, false],
    ['IMAGE_GROK', false, false],
    ['IMAGE_LOCAL_COMFYUI', false, false],
    ['image_openai', true, true],
    ['UNKNOWN', false, false],
  ])('%s → edit=%s mask=%s', (provider, edit, mask) => {
    expect(supportsImageEdit(provider)).toBe(edit);
    expect(supportsImageMask(provider)).toBe(mask);
  });

  it('keeps an edit-capable pick and swaps a model that cannot edit', () => {
    expect(imageEditModelFor('IMAGE_OPENAI', 'gpt-image-1-mini')).toBe('gpt-image-1-mini');
    expect(imageEditModelFor('IMAGE_OPENAI', 'dall-e-3')).toBe('gpt-image-1');
    expect(imageEditModelFor('IMAGE_GEMINI', 'gemini-3-pro-image')).toBe('gemini-3-pro-image');
    expect(imageEditModelFor('IMAGE_GROK', 'grok-imagine-image')).toBeUndefined();
  });

  it('lists edit providers in preference order, and mask providers only on request', () => {
    expect(imageEditProviders().map((entry) => entry.provider)).toEqual([
      'IMAGE_GEMINI',
      'IMAGE_OPENAI',
      'IMAGE_LOCAL',
    ]);
    expect(imageEditProviders(true).map((entry) => entry.provider)).toEqual(['IMAGE_OPENAI']);
    expect(imageEditCapabilityOf('IMAGE_GROK')?.reference).toBe(false);
  });
});
