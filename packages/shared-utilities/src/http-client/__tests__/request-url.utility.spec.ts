import { assertSafeRequestUrl } from '../request-url.utility';
import { internalHostAllowlist, resetInternalHostAllowlist } from '../internal-hosts.utility';

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

// CodeQL js/request-forgery, alert #58. The URL reaches fetch directly, so the
// chokepoint decides where this process may connect — not each caller.
describe('assertSafeRequestUrl: where a service may connect', () => {
  const hosts = new Set(['auth-service:4001', 'connector-service:4003']);

  it('allows a host this deployment is configured to call', () => {
    expect(assertSafeRequestUrl('https://auth-service:4001/api/v1/internal/x', hosts).host).toBe(
      'auth-service:4001',
    );
  });

  it.each([
    ['https://evil.example/steal', 'a host nowhere in the configuration'],
    ['https://auth-service:9999/x', 'the right name on the wrong port'],
    ['https://auth-service.evil.example/x', 'a lookalike suffix'],
  ])('refuses %s (%s)', (url) => {
    expect(() => assertSafeRequestUrl(url, hosts)).toThrow(/does not call/u);
  });

  // Whatever the configuration says: these hand out instance credentials.
  it.each([
    'http://169.254.169.254/latest/meta-data/',
    'http://metadata.google.internal/computeMetadata/v1/',
  ])('refuses the metadata address %s', (url) => {
    expect(() => assertSafeRequestUrl(url, new Set(['169.254.169.254']))).toThrow(/metadata/u);
  });

  // A process with no service configuration (a unit test, a tool) must not be
  // bricked: this guards where CONFIGURED calls may go.
  it('stands down when nothing is configured', () => {
    expect(assertSafeRequestUrl('https://anywhere.example/x', new Set()).host).toBe(
      'anywhere.example',
    );
  });
});

describe('internalHostAllowlist', () => {
  afterEach(() => {
    resetInternalHostAllowlist();
  });

  it('is every host the environment names as a service', () => {
    const hosts = internalHostAllowlist({
      AUTH_SERVICE_URL: 'https://auth-service:4001',
      OLLAMA_BASE_URL: 'http://ollama:11434',
      CONNECTOR_API_URL: 'https://connector-service:4003/api',
      JWT_SECRET: 'not-a-url',
      SOMETHING_ELSE: 'https://ignored.example',
      EMPTY_SERVICE_URL: '',
    });

    expect([...hosts].sort()).toEqual([
      'auth-service:4001',
      'connector-service:4003',
      'ollama:11434',
    ]);
  });

  it('ignores a variable that is not a usable http URL', () => {
    expect(
      internalHostAllowlist({ BROKEN_SERVICE_URL: 'not a url', FILE_SERVICE_URL: 'file:///etc' })
        .size,
    ).toBe(0);
  });
});
