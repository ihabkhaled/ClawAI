import { type Mock, vi } from 'vitest';
import { resetInternalHostAllowlist } from '@claw/shared-utilities';

import { checkedRequestUrl, guardedDownloadFetch, guardedFetch } from '../guarded-fetch.utility';

/**
 * TD-040. workspace-service's one door for outbound HTTP.
 *
 * Every case runs with a CI-shaped environment: a GitHub runner defines
 * `*_ENDPOINT` variables, which switches the shared guard from its
 * empty-environment stand-down to ENFORCING. A test that only passes on a
 * machine with no such variable proves nothing, which is how three fake-host
 * tests reached CI red in one week. MEMORY_SERVICE_URL stands in for "an
 * internal service this process legitimately calls".
 */

const GRAPH = 'https://graph.microsoft.com/v1.0';

function enforceLikeCi(): void {
  vi.stubEnv('ACTIONS_RESULTS_ENDPOINT', 'https://x.example');
  vi.stubEnv('MEMORY_SERVICE_URL', 'http://memory-service:4012');
  resetInternalHostAllowlist();
}

function redirectTo(location: string | null, status = 302): Response {
  return {
    ok: false,
    status,
    headers: { get: (name: string) => (name === 'location' ? location : null) },
  } as Response;
}

describe('guarded-fetch.utility', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    enforceLikeCi();
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetInternalHostAllowlist();
  });

  describe('guardedFetch', () => {
    it('reaches the declared host and refuses redirects', async () => {
      await guardedFetch('https://api.github.com', 'https://api.github.com/user', {
        headers: { Authorization: 'Bearer t' },
      });
      const [target, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(target).toBe('https://api.github.com/user');
      expect(init.redirect).toBe('error');
      expect(init.headers).toEqual({ Authorization: 'Bearer t' });
    });

    it('overrides a caller that asks to follow redirects', async () => {
      await guardedFetch('https://api.github.com', 'https://api.github.com/user', {
        redirect: 'follow',
      });
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.redirect).toBe('error');
    });

    it('reaches an internal service declared by its *_SERVICE_URL', async () => {
      await guardedFetch('http://memory-service:4012', 'http://memory-service:4012/api/v1/x');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('refuses a host that is not the declared one, before any network call', async () => {
      await expect(
        guardedFetch('https://api.github.com', 'https://attacker.example/user'),
      ).rejects.toThrow(/attacker\.example/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    // The platform allowlist also holds every internal service. A provider
    // call must not be able to land on one of them just because it is "known".
    it('refuses an allowlisted internal host when a provider host was declared', async () => {
      await expect(
        guardedFetch('https://gitlab.com/api/v4', 'http://memory-service:4012/api/v4/user'),
      ).rejects.toThrow(/memory-service:4012 is not the host this call was declared for/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
      ['a file: URL', 'file:///etc/passwd', 'file:///etc/passwd'],
      ['embedded credentials', 'https://api.github.com', 'https://u:p@api.github.com/user'],
      ['the cloud metadata address', 'http://169.254.169.254', 'http://169.254.169.254/latest'],
      ['a relative URL', 'https://api.github.com', '/user'],
    ])('refuses %s before any network call', async (_label, base, url) => {
      await expect(guardedFetch(base, url)).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('refuses everything when the declared base is not a URL', async () => {
      await expect(guardedFetch('', 'https://api.github.com/user')).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('surfaces a refused redirect as a rejected fetch', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed: unexpected redirect'));
      await expect(
        guardedFetch('https://api.github.com', 'https://api.github.com/repos/a/b'),
      ).rejects.toThrow(/redirect/);
    });
  });

  describe('checkedRequestUrl', () => {
    it('returns the parsed URL when both checks pass', () => {
      expect(checkedRequestUrl(GRAPH, `${GRAPH}/me`).host).toBe('graph.microsoft.com');
    });
  });

  describe('guardedDownloadFetch', () => {
    const contentUrl = `${GRAPH}/me/drive/items/abc/content`;
    const init = { headers: { Authorization: 'Bearer secret-token' } };

    it('returns a direct answer untouched, asking fetch not to follow', async () => {
      const direct = { ok: true, status: 200 };
      fetchMock.mockResolvedValueOnce(direct);
      await expect(guardedDownloadFetch(GRAPH, contentUrl, init)).resolves.toBe(direct);
      const [, firstInit] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(firstInit.redirect).toBe('manual');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('follows one redirect to a public https CDN host WITHOUT the bearer token', async () => {
      const cdn = 'https://contoso-my.sharepoint.com/download.aspx?tempauth=pre-signed';
      const bytes = { ok: true, status: 200 };
      fetchMock.mockResolvedValueOnce(redirectTo(cdn)).mockResolvedValueOnce(bytes);
      await expect(guardedDownloadFetch(GRAPH, contentUrl, init)).resolves.toBe(bytes);
      const [hop, hopInit] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(hop).toBe(cdn);
      expect(hopInit.headers).toBeUndefined();
      expect(hopInit.redirect).toBe('error');
    });

    it.each([
      ['plain http', 'http://contoso-my.sharepoint.com/f?tempauth=secret'],
      ['a private address', 'https://10.0.0.5/f?tempauth=secret'],
      ['an IPv4 literal', 'https://52.1.2.3/f?tempauth=secret'],
      ['an IPv6 literal', 'https://[::1]/f?tempauth=secret'],
      ['loopback by name', 'https://localhost/f?tempauth=secret'],
      ['embedded credentials', 'https://u:p@cdn.example/f?tempauth=secret'],
      ['the cloud metadata address', 'https://169.254.169.254/f?tempauth=secret'],
    ])('refuses a redirect to %s, and never echoes the signed URL', async (_label, location) => {
      fetchMock.mockResolvedValueOnce(redirectTo(location));
      const outcome = guardedDownloadFetch(GRAPH, contentUrl, init);
      await expect(outcome).rejects.toThrow(/download redirect refused/);
      await expect(outcome).rejects.not.toThrow(/tempauth|secret/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('returns a redirect with no Location as-is, for the caller to treat as a failure', async () => {
      const bare = redirectTo(null);
      fetchMock.mockResolvedValueOnce(bare);
      await expect(guardedDownloadFetch(GRAPH, contentUrl, init)).resolves.toBe(bare);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('checks the first request like guardedFetch', async () => {
      await expect(
        guardedDownloadFetch(GRAPH, 'https://attacker.example/content', init),
      ).rejects.toThrow(/attacker\.example/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
