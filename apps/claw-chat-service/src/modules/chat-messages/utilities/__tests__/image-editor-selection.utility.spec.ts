import { describe, expect, it } from 'vitest';
import { imageEditProviders, supportsImageMask } from '@claw/shared-utilities';
import { keepsRoutedImageProvider, selectImageEditor } from '../image-editor-selection.utility';

describe('selectImageEditor', () => {
  it('takes the first edit-capable provider when there is no mask', () => {
    expect(selectImageEditor(false)).toEqual(imageEditProviders()[0]);
  });

  // 2026-09-29 live: a masked edit went to the first editor (Gemini) and was refused.
  it('takes a mask-capable provider when the turn carries a mask', () => {
    const editor = selectImageEditor(true);

    expect(editor).toBeDefined();
    expect(supportsImageMask(editor?.provider ?? '')).toBe(true);
  });
});

describe('keepsRoutedImageProvider', () => {
  it('keeps any routed IMAGE_ provider when there is no mask', () => {
    expect(keepsRoutedImageProvider('IMAGE_GEMINI', false)).toBe(true);
  });

  // 2026-09-29 live: routing picked IMAGE_GEMINI and the masked edit was refused.
  it('does not keep an IMAGE_ provider that cannot apply the mask', () => {
    expect(keepsRoutedImageProvider('IMAGE_GEMINI', true)).toBe(false);
  });

  it('keeps an IMAGE_ provider that can apply the mask', () => {
    expect(keepsRoutedImageProvider('IMAGE_OPENAI', true)).toBe(true);
  });

  it('never keeps a non-image provider', () => {
    expect(keepsRoutedImageProvider('GEMINI', false)).toBe(false);
  });
});
