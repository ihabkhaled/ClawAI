import { assertSafeRequestUrl } from '../request-url.utility';

describe('assertSafeRequestUrl', () => {
  it('allows the internal service calls this client exists for', () => {
    expect(assertSafeRequestUrl('http://claw-auth-service:4001/internal/quota').protocol).toBe(
      'http:',
    );
    expect(assertSafeRequestUrl('https://api.openai.com/v1/models').protocol).toBe('https:');
  });

  it.each(['file:///etc/passwd', 'data:text/plain,hi', 'ftp://example.com/x', 'gopher://x/1'])(
    'refuses %s',
    (url) => {
      // file: reads the container's disk; data: smuggles a response body in the
      // URL itself. Neither is ever a service call.
      expect(() => assertSafeRequestUrl(url)).toThrow(/protocol/u);
    },
  );

  it('refuses embedded credentials', () => {
    // Makes a hostile host look trusted at a glance, and leaks into every log
    // line that prints the URL.
    expect(() => assertSafeRequestUrl('https://user:pass@evil.example.com/x')).toThrow(
      /credentials/u,
    );
  });

  it('refuses a relative URL rather than resolving it against something', () => {
    expect(() => assertSafeRequestUrl('/internal/quota')).toThrow(/absolute/u);
  });
});
