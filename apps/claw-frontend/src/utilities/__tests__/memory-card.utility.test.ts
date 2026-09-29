import { describe, expect, it } from 'vitest';

import { MEMORY_CARD_PREVIEW_MAX_CHARS } from '@/constants/memory.constants';

import { memoryCardPreview } from '../memory-card.utility';

describe('memoryCardPreview', () => {
  it('returns short markdown untouched', () => {
    expect(memoryCardPreview('# Title\n\n- item')).toBe('# Title\n\n- item');
  });

  it('bounds a 250K memory to the preview size and marks the cut', () => {
    const preview = memoryCardPreview('x'.repeat(250_000));
    expect(preview.length).toBe(MEMORY_CARD_PREVIEW_MAX_CHARS + 3);
    expect(preview.endsWith('\n\n…')).toBe(true);
  });
});
