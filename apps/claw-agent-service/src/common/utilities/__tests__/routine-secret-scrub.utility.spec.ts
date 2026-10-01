import { scrubSecretValues } from '../routine-secret-scrub.utility';

describe('scrubSecretValues', () => {
  it('replaces every occurrence of every value', () => {
    expect(
      scrubSecretValues('a=s3cret-one b=s3cret-two a=s3cret-one', ['s3cret-one', 's3cret-two']),
    ).toBe('a=[REDACTED] b=[REDACTED] a=[REDACTED]');
  });

  it('removes the longer value whole when one value contains another', () => {
    expect(scrubSecretValues('token=abcdef-extended', ['abcdef', 'abcdef-extended'])).toBe(
      'token=[REDACTED]',
    );
  });

  it('leaves values too short to be credentials alone, and text without matches unchanged', () => {
    expect(scrubSecretValues('exit 1 of 12', ['1', '12'])).toBe('exit 1 of 12');
    expect(scrubSecretValues('nothing here', ['s3cret-value'])).toBe('nothing here');
  });

  it('does not treat a value as a pattern', () => {
    expect(scrubSecretValues('cost $1.50 (a+b)', ['$1.50', '(a+b)'])).toBe(
      'cost [REDACTED] [REDACTED]',
    );
  });

  it('is a no-op with no values', () => {
    expect(scrubSecretValues('same', [])).toBe('same');
  });
});
