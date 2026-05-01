import { compilePolicyPattern, isPolicyPatternSafe } from '../policy-regex.utility';

describe('policy-regex.utility', () => {
  it('compiles a simple pattern', () => {
    const re = compilePolicyPattern('^DRAFT$');
    expect(re.test('DRAFT')).toBe(true);
    expect(re.test('SUMMARIZE')).toBe(false);
  });

  it('rejects pattern over 256 chars', () => {
    const long = 'a'.repeat(257);
    expect(() => compilePolicyPattern(long)).toThrow('exceeds maximum length');
  });

  it('rejects nested-quantifier (catastrophic backtracking shape)', () => {
    expect(() => compilePolicyPattern('(a+)+$')).toThrow('suspicious nested quantifiers');
  });

  it('isPolicyPatternSafe returns true for safe', () => {
    expect(isPolicyPatternSafe('^DRAFT$')).toBe(true);
  });

  it('isPolicyPatternSafe returns false for unsafe', () => {
    expect(isPolicyPatternSafe('(a+)+$')).toBe(false);
    expect(isPolicyPatternSafe('a'.repeat(300))).toBe(false);
  });
});
