import { redactUrlSecrets } from '../redact-url-secrets.utility';

describe('redactUrlSecrets', () => {
  it('redacts a key query parameter', () => {
    expect(
      redactUrlSecrets('https://vision.googleapis.com/v1/images:annotate?key=AIzaSECRET'),
    ).toBe('https://vision.googleapis.com/v1/images:annotate?key=[REDACTED]');
  });

  it.each(['api_key', 'apikey', 'token', 'access_token', 'secret', 'signature', 'x-goog-api-key'])(
    'redacts %s anywhere in the query',
    (name) => {
      const out = redactUrlSecrets(`https://h.example/p?a=1&${name}=VALUE123&b=2`);
      expect(out).toBe(`https://h.example/p?a=1&${name}=[REDACTED]&b=2`);
      expect(out).not.toContain('VALUE123');
    },
  );

  it('is case-insensitive on the name', () => {
    expect(redactUrlSecrets('https://h.example/?API_KEY=abc')).toBe(
      'https://h.example/?API_KEY=[REDACTED]',
    );
  });

  it('leaves harmless parameters and look-alike names alone', () => {
    const url = 'https://h.example/p?page=2&monkey=1&limit=5';
    expect(redactUrlSecrets(url)).toBe(url);
  });

  it('redacts a URL embedded in an error message', () => {
    const out = redactUrlSecrets('request to https://h.example/p?key=ZZZ failed: timeout');
    expect(out).toBe('request to https://h.example/p?key=[REDACTED] failed: timeout');
  });

  it('keeps the fragment', () => {
    expect(redactUrlSecrets('https://h.example/p?token=abc#frag')).toBe(
      'https://h.example/p?token=[REDACTED]#frag',
    );
  });
});
