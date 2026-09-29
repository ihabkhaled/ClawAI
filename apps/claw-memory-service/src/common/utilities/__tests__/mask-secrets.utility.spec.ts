import { maskSecrets } from '../mask-secrets.utility';
import { isLuhnValid, looksLikeSecretToken } from '../sensitivity-validators.utility';

describe('isLuhnValid', () => {
  it('accepts a real test card number with spaces or dashes', () => {
    expect(isLuhnValid('4111 1111 1111 1111')).toBe(true);
    expect(isLuhnValid('4111-1111-1111-1111')).toBe(true);
  });

  it('rejects order numbers and out-of-range lengths', () => {
    expect(isLuhnValid('1234567890123')).toBe(false);
    expect(isLuhnValid('123456789012')).toBe(false);
    expect(isLuhnValid('12345678901234567890')).toBe(false);
  });
});

describe('looksLikeSecretToken', () => {
  it('accepts a mixed-case token with digits', () => {
    expect(looksLikeSecretToken('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')).toBe(true);
  });

  it('rejects lower-case paths and slash-heavy runs', () => {
    expect(looksLikeSecretToken('docs/careplans/documentation/entries/xyz')).toBe(false);
    expect(looksLikeSecretToken('Api/V1/Care/Plans/Doc/Entry/Rule/Check12')).toBe(false);
  });
});

describe('maskSecrets', () => {
  it('masks every secret span, keeps length, and reports each pattern once', () => {
    const text = 'a AKIA1234567890ABCDEF b 4111 1111 1111 1111 c AKIA1234567890ABCDEG d';
    const result = maskSecrets(text);
    expect(result.masked).toHaveLength(text.length);
    expect(result.masked).not.toContain('AKIA1234567890ABCDEF');
    expect(result.masked).not.toContain('4111 1111 1111 1111');
    expect(result.masked.startsWith('a AK')).toBe(true);
    expect(result.masked.endsWith(' d')).toBe(true);
    expect(result.matched).toEqual(['aws_access_key', 'credit_card']);
  });

  it('leaves ordinary markdown untouched', () => {
    const text = '## Order 1234567890123\n\nSee docs/careplans/documentation/entries/rules.';
    expect(maskSecrets(text)).toEqual({ masked: text, matched: [] });
  });

  it('masks short matches fully', () => {
    expect(maskSecrets('ssn 123-45-6789 here').masked).toBe('ssn 12*****6789 here');
  });
});
