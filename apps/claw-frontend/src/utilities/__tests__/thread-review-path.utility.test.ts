import { describe, expect, it } from 'vitest';

import { threadReviewPath } from '@/utilities/thread-review-path.utility';

describe('threadReviewPath', () => {
  it('points at the owner page for one publication', () => {
    expect(threadReviewPath('abc123')).toBe('/threads/review/abc123');
  });

  it('encodes anything that is not path-safe', () => {
    expect(threadReviewPath('a/b c')).toBe('/threads/review/a%2Fb%20c');
  });
});
