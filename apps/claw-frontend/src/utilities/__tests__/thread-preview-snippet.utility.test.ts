import { describe, expect, it } from 'vitest';

import { buildThreadPreviewSnippet } from '@/utilities/thread-preview-snippet.utility';

describe('buildThreadPreviewSnippet', () => {
  it('returns null when model is null', () => {
    expect(buildThreadPreviewSnippet(null, null)).toBeNull();
    expect(buildThreadPreviewSnippet('openai', null)).toBeNull();
  });

  it('returns just the model when provider is null', () => {
    expect(buildThreadPreviewSnippet(null, 'gpt-4o-mini')).toBe('gpt-4o-mini');
  });

  it('returns provider + dot-separator + model when both are present', () => {
    expect(buildThreadPreviewSnippet('openai', 'gpt-4o-mini')).toBe('openai · gpt-4o-mini');
  });
});
