import { describe, expect, it } from 'vitest';

import { base64ByteLength, base64FromDataUrl } from '@/utilities/feedback-file.utility';

// file-service compares the declared size against the decoded size exactly and
// answers 400 FILE_SIZE_MISMATCH when they differ. The screenshot and paste
// paths derive the size from base64, so an estimate that ignores '=' padding
// overstated every payload by one or two bytes and made every screenshot
// upload fail. These cases pin the padding arithmetic.

describe('base64ByteLength', () => {
  it('matches the real decoded length for every padding case', () => {
    // 'a' -> 'YQ==' (2 pad), 'ab' -> 'YWI=' (1 pad), 'abc' -> 'YWJj' (0 pad).
    expect(base64ByteLength('YQ==')).toBe(1);
    expect(base64ByteLength('YWI=')).toBe(2);
    expect(base64ByteLength('YWJj')).toBe(3);
  });

  it('agrees with the browser decoder across lengths', () => {
    for (let length = 0; length <= 32; length += 1) {
      const raw = 'x'.repeat(length);
      const encoded = btoa(raw);
      expect(base64ByteLength(encoded)).toBe(length);
    }
  });

  it('reports zero for an empty payload', () => {
    expect(base64ByteLength('')).toBe(0);
  });

  it('ignores whitespace a data URL may carry', () => {
    expect(base64ByteLength('YWJj\n')).toBe(3);
    expect(base64ByteLength('YW Jj')).toBe(3);
  });

  it('never overstates the size, which is what caused the 400', () => {
    // The previous implementation was Math.ceil((length * 3) / 4), which
    // returns 2 for 'YQ==' where the true answer is 1.
    const encoded = btoa('a');
    expect(Math.ceil((encoded.length * 3) / 4)).toBe(3);
    expect(base64ByteLength(encoded)).toBe(1);
  });
});

describe('base64FromDataUrl', () => {
  it('strips the data URL prefix', () => {
    expect(base64FromDataUrl('data:image/png;base64,YWJj')).toBe('YWJj');
  });

  it('passes through a bare base64 payload', () => {
    expect(base64FromDataUrl('YWJj')).toBe('YWJj');
  });
});
