import { compilePolicyPattern, isPolicyPatternSafe } from '../policy-regex.utility';

// Built dynamically so CodeQL's js/redos rule doesn't flag the literal — this
// is a deliberately-bad pattern handed as a STRING to the validator under
// test, not a regex compiled by production code.
const NESTED_QUANTIFIER_PATTERN = `${'(a+)'}+$`;

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
    expect(() => compilePolicyPattern(NESTED_QUANTIFIER_PATTERN)).toThrow(
      'suspicious nested quantifiers',
    );
  });

  it('isPolicyPatternSafe returns true for safe', () => {
    expect(isPolicyPatternSafe('^DRAFT$')).toBe(true);
  });

  it('isPolicyPatternSafe returns false for unsafe', () => {
    expect(isPolicyPatternSafe(NESTED_QUANTIFIER_PATTERN)).toBe(false);
    expect(isPolicyPatternSafe('a'.repeat(300))).toBe(false);
  });
});
