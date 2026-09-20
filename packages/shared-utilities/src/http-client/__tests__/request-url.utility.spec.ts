import { assertSafeRequestUrl, declaredHost } from '../request-url.utility';
import { EXTERNAL_ENDPOINT_HOSTS, INTERNAL_HOST_ENV_SUFFIXES } from '../request-url.constants';
import { internalHostAllowlist, resetInternalHostAllowlist } from '../internal-hosts.utility';

/**
 * Runs `body` with every service-naming environment variable removed.
 *
 * The guard reads `process.env` directly, so a test about the unconfigured
 * case has to make the process unconfigured rather than hope it is. A GitHub
 * runner defines variables ending in `_ENDPOINT`, which is why assuming a bare
 * environment passed locally and failed on CI.
 */
function withoutServiceEnvironment(body: () => void): void {
  const removed = new Map<string, string>();
  for (const [name, value] of Object.entries(process.env)) {
    if (value !== undefined && INTERNAL_HOST_ENV_SUFFIXES.some((s) => name.endsWith(s))) {
      removed.set(name, value);
      Reflect.deleteProperty(process.env, name);
    }
  }
  resetInternalHostAllowlist();
  try {
    body();
  } finally {
    for (const [name, value] of removed) {
      process.env[name] = value;
    }
    resetInternalHostAllowlist();
  }
}

describe('assertSafeRequestUrl', () => {
  it('allows the internal service calls this client exists for', () => {
    withoutServiceEnvironment(() => {
      expect(assertSafeRequestUrl('http://claw-auth-service:4001/internal/quota').protocol).toBe(
        'http:',
      );
      expect(assertSafeRequestUrl('https://api.openai.com/v1/models').protocol).toBe('https:');
    });
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
  //
  // The environment has to be cleared explicitly rather than assumed bare. A
  // GitHub runner sets variables ending in `_ENDPOINT`, so on CI the allowlist
  // was NOT empty and this case correctly enforced — which is how this test
  // failed on CI while passing on a developer machine.
  it('stands down when nothing is configured', () => {
    withoutServiceEnvironment(() => {
      expect(assertSafeRequestUrl('https://anywhere.example/x', new Set()).host).toBe(
        'anywhere.example',
      );
    });
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

// Until 2026-09-20 the host check only ran when a caller passed a set, so a
// caller that passed nothing reached fetch unchecked — the path CodeQL kept
// re-detecting after every other hardening. These cover the closed version.
describe('assertSafeRequestUrl: the host check is not optional', () => {
  const previous = process.env.PROOF_SERVICE_URL;

  beforeEach(() => {
    process.env.PROOF_SERVICE_URL = 'https://proof-service:4099';
    resetInternalHostAllowlist();
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.PROOF_SERVICE_URL;
    } else {
      process.env.PROOF_SERVICE_URL = previous;
    }
    resetInternalHostAllowlist();
  });

  it('allows a host named by this process environment, with no caller opt-in', () => {
    expect(assertSafeRequestUrl('https://proof-service:4099/api/v1/x').host).toBe(
      'proof-service:4099',
    );
  });

  it('refuses an unknown host even though the caller passed no allowlist', () => {
    expect(() => assertSafeRequestUrl('https://evil.example/steal')).toThrow(/does not call/u);
  });

  it('allows the third-party endpoints written down in code', () => {
    // These have no environment variable: the FX sources, the geo lookup and
    // the payment gateways are constants. Making the check unconditional
    // without them would refuse legitimate traffic.
    for (const host of EXTERNAL_ENDPOINT_HOSTS) {
      expect(assertSafeRequestUrl(`https://${host}/probe`).host).toBe(host);
    }
  });

  it('allows a host the caller declares because an admin configured it', () => {
    const base = 'http://comfyui.internal:8188';
    expect(assertSafeRequestUrl(`${base}/system_stats`, declaredHost(base)).host).toBe(
      'comfyui.internal:8188',
    );
  });
});

describe('declaredHost', () => {
  it('is the single host of a configured base URL', () => {
    expect([...declaredHost('https://comfy.example:8188/api')]).toEqual(['comfy.example:8188']);
  });

  it('is empty for a value that is not a URL, so a broken config refuses the call', () => {
    expect(declaredHost('not a url').size).toBe(0);
  });
});
