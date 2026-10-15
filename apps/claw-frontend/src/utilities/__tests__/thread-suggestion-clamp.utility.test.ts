import { describe, expect, it } from 'vitest';

import { clampSuggestionText } from '@/utilities/thread-suggestion-clamp.utility';

describe('clampSuggestionText', () => {
  it('leaves a short text alone', () => {
    expect(clampSuggestionText('short', 600, false)).toEqual({ text: 'short', isLong: false });
  });

  it('clamps a long text to the limit with an ellipsis, and shows all of it once expanded', () => {
    const long = 'a'.repeat(5000);
    const clamped = clampSuggestionText(long, 600, false);
    expect(clamped.isLong).toBe(true);
    expect(clamped.text).toBe(`${'a'.repeat(600)}…`);
    expect(clampSuggestionText(long, 600, true).text).toBe(long);
  });

  it('never cuts an emoji in half', () => {
    const text = `${'a'.repeat(599)}😀tail`;
    expect(clampSuggestionText(text, 600, false).text).toBe(`${'a'.repeat(599)}…`);
  });
});
