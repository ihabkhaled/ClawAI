import { describe, expect, it } from 'vitest';

import { insertNewlineAtSelection } from '@/utilities/composer-newline.utility';

describe('insertNewlineAtSelection', () => {
  it('inserts at the caret', () => {
    expect(insertNewlineAtSelection('ab', 1, 1)).toEqual({ value: 'a\nb', caret: 2 });
  });
  it('replaces a selection', () => {
    expect(insertNewlineAtSelection('abcd', 1, 3)).toEqual({ value: 'a\nd', caret: 2 });
  });
  it('handles a reversed selection', () => {
    expect(insertNewlineAtSelection('abcd', 3, 1)).toEqual({ value: 'a\nd', caret: 2 });
  });
});
