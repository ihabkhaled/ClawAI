import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';

import type { PinnedAddress } from '../../../../common/types/ip-address.types';
import { hostResolution } from '../../../../common/utilities/dns-guard.utility';
import { followRedirectsSafely } from '../safe-redirect.utility';
import { pinnedFetch } from '../pinned-fetch.utility';

describe('pinnedFetch against a real local server', () => {
  let server: http.Server;
  let port = 0;
  let seenHost = '';

  beforeAll(async () => {
    server = http.createServer((request, reply) => {
      seenHost = request.headers.host ?? '';
      if (request.url === '/gz') {
        reply.writeHead(200, { 'content-encoding': 'gzip', 'content-type': 'text/plain' });
        reply.end(gzipSync('zipped body'));
        return;
      }
      if (request.url === '/go') {
        reply.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data' });
        reply.end();
        return;
      }
      reply.writeHead(200, { 'content-type': 'text/plain' });
      reply.end('plain body');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    port = typeof address === 'object' && address !== null ? (address as AddressInfo).port : 0;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const pin: PinnedAddress = { address: '127.0.0.1', family: 4 };
  const base = (): string => `http://never-resolved.invalid:${String(port)}`;

  it('connects to the pinned IP while keeping the hostname in Host', async () => {
    const response = await pinnedFetch(`${base()}/`, pin, {});

    expect(await response.text()).toBe('plain body');
    expect(seenHost).toBe(`never-resolved.invalid:${String(port)}`);
  });

  it('decodes gzip bodies', async () => {
    const response = await pinnedFetch(`${base()}/gz`, pin, {});

    expect(await response.text()).toBe('zipped body');
    expect(response.headers.get('content-encoding')).toBeNull();
  });

  it('returns a redirect untouched instead of following it', async () => {
    const response = await pinnedFetch(`${base()}/go`, pin, {});

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://169.254.169.254/latest/meta-data');
  });

  it('honours an abort signal', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(pinnedFetch(`${base()}/`, pin, { signal: controller.signal })).rejects.toThrow();
  });
});

describe('DNS rebinding through followRedirectsSafely', () => {
  const original = hostResolution.resolve;
  afterEach(() => {
    hostResolution.resolve = original;
  });

  it('never sends when the second DNS answer is private', async () => {
    hostResolution.resolve = vi.fn().mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '::ffff:7f00:1', family: 6 },
    ]);
    const send = vi.fn();

    await expect(
      followRedirectsSafely('https://rebind.example/', send, { maxRedirects: 3, allowlist: [] }),
    ).rejects.toThrow(/private\/loopback/u);
    expect(send).not.toHaveBeenCalled();
  });

  it('hands send the one validated address, resolved once per hop', async () => {
    const resolve = vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    hostResolution.resolve = resolve;
    const send = vi.fn().mockResolvedValue({ status: 200, location: null, response: 'ok' });

    await followRedirectsSafely('https://example.com/', send, { maxRedirects: 3, allowlist: [] });

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('https://example.com/', {
      address: '93.184.216.34',
      family: 4,
    });
  });

  it('re-resolves a redirect hop whose name now points inward', async () => {
    hostResolution.resolve = vi
      .fn()
      .mockImplementation((host: string) =>
        Promise.resolve([
          host === 'evil.example'
            ? { address: '10.0.0.7', family: 4 }
            : { address: '93.184.216.34', family: 4 },
        ]),
      );
    const send = vi
      .fn()
      .mockResolvedValueOnce({ status: 302, location: 'https://evil.example/x', response: 'r' });

    await expect(
      followRedirectsSafely('https://good.example/', send, { maxRedirects: 3, allowlist: [] }),
    ).rejects.toThrow(/private\/loopback/u);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('refuses a redirect straight to a mapped-IPv6 loopback', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ status: 302, location: 'http://[::ffff:7f00:1]/', response: 'r' });

    await expect(
      followRedirectsSafely('https://good.example/', send, { maxRedirects: 3, allowlist: [] }),
    ).rejects.toThrow();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
