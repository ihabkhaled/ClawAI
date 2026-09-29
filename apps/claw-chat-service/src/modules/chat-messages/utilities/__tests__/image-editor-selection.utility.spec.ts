import { describe, expect, it } from 'vitest';
import { imageEditProviders, supportsImageMask } from '@claw/shared-utilities';
import { selectImageEditor } from '../image-editor-selection.utility';

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
