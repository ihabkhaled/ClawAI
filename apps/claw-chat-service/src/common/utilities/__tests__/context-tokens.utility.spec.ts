import { describe, expect, it } from 'vitest';

import { contextTokens } from '../context-tokens.utility';

describe('contextTokens (owner report 2026-11-28: non-Latin words were deleted)', () => {
  it('keeps Arabic words, folds spelling variants and drops the article', () => {
    expect(contextTokens('السِّرّ بتاعي هو المانجا', 4)).toEqual(['سر', 'بتاعي', 'مانجا']);
    expect(contextTokens('إيه السر؟', 4)).toEqual(['سر']);
    expect(contextTokens('أغنية', 4)).toEqual(contextTokens('اغنيه', 4));
  });

  it('keeps short Latin words out and numbers in at the asked length', () => {
    expect(contextTokens('What is my secret code 1234', 4)).toEqual([
      'what',
      'secret',
      'code',
      '1234',
    ]);
  });

  it('matches Chinese, Japanese and Thai by character pairs, and keeps Cyrillic and Hindi words', () => {
    expect(contextTokens('我的秘密', 4)).toEqual(['我的', '的秘', '秘密']);
    expect(contextTokens('мой секрет', 4)).toEqual(['мой', 'секрет']);
    expect(contextTokens('मेरा रहस्य', 4)).toEqual(['मेरा', 'रहस्य']);
  });
});
