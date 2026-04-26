import { compilePolicyPattern } from '../policy-regex.utility';

describe('compilePolicyPattern', () => {
  it('returns a RegExp for a normal pattern', () => {
    const result = compilePolicyPattern('^rm -rf');
    expect(result).toBeInstanceOf(RegExp);
    expect(result.test('rm -rf /')).toBe(true);
    expect(result.test('ls -la')).toBe(false);
  });

  it('throws when pattern exceeds 256 chars', () => {
    const long = 'a'.repeat(257);
    expect(() => compilePolicyPattern(long)).toThrow(/exceeds maximum length/);
  });

  it('accepts pattern at exactly 256 chars', () => {
    const at = 'a'.repeat(256);
    expect(() => compilePolicyPattern(at)).not.toThrow();
  });

  it('throws on nested-quantifier patterns (ReDoS suspect)', () => {
    expect(() => compilePolicyPattern('(a+)+')).toThrow(/nested quantifiers/);
    expect(() => compilePolicyPattern('(a*)*')).toThrow(/nested quantifiers/);
  });

  it('compiles complex but safe patterns', () => {
    const result = compilePolicyPattern('^(sudo|su)\\s+');
    expect(result.test('sudo rm')).toBe(true);
    expect(result.test('ls')).toBe(false);
  });
});
