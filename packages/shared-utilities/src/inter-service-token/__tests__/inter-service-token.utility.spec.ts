import {
  assertInterServiceTokenNotPlaceholder,
  isPlaceholderInterServiceToken,
} from '../inter-service-token.utility';

const DEFAULT_TOKEN = 'change-me-inter-service-token-32-chars-min';
const REAL_TOKEN = 'k3Jx9Qm2Vb7LwZp4Tn8Rc5Yd1Hs6Gf0A';

describe('inter-service token placeholder check', () => {
  it('recognises the repository default and the .env.example value', () => {
    expect(isPlaceholderInterServiceToken(DEFAULT_TOKEN)).toBe(true);
    expect(
      isPlaceholderInterServiceToken('change-me-inter-service-token-32-chars-min-aaaaaaaaaa'),
    ).toBe(true);
    expect(isPlaceholderInterServiceToken('CHANGEME-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
  });

  it('accepts a random secret', () => {
    expect(isPlaceholderInterServiceToken(REAL_TOKEN)).toBe(false);
  });

  it('throws for a placeholder in production', () => {
    expect(() => assertInterServiceTokenNotPlaceholder(DEFAULT_TOKEN, 'production')).toThrow(
      /INTER_SERVICE_AUTH_TOKEN/,
    );
  });

  it('allows a placeholder outside production', () => {
    expect(() => assertInterServiceTokenNotPlaceholder(DEFAULT_TOKEN, 'development')).not.toThrow();
    expect(() => assertInterServiceTokenNotPlaceholder(DEFAULT_TOKEN, undefined)).not.toThrow();
    expect(() => assertInterServiceTokenNotPlaceholder(DEFAULT_TOKEN, 'test')).not.toThrow();
  });

  it('allows a real secret in production', () => {
    expect(() => assertInterServiceTokenNotPlaceholder(REAL_TOKEN, 'production')).not.toThrow();
  });
});
