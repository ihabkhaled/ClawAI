import { isIP } from 'node:net';
import { vi } from 'vitest';
import { originOf, resolveSessionOrigin } from '../session-origin.utility';

// The platform rule (shared-auth): X-Real-IP counts only when the socket peer is the trusted proxy.
vi.mock('@claw/shared-auth', () => ({
  resolveClientAddress: (headers: Record<string, string | string[] | undefined>, peer?: string) => {
    if (peer === undefined) return Promise.resolve(null);
    const real = headers['x-real-ip'];
    const viaProxy = typeof real === 'string' && peer.startsWith('172.18.');
    return Promise.resolve({ address: viaProxy ? real : peer, viaProxy });
  },
  normalizeIpAddress: (value: string) => (isIP(value) === 0 ? null : value),
}));

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

describe('resolveSessionOrigin', () => {
  it('reads the trusted-proxy address, the country offline and the parsed agent', async () => {
    // nginx overwrites X-Real-IP; the socket peer is the proxy.
    const origin = await resolveSessionOrigin(
      { 'x-real-ip': '41.33.1.1', 'user-agent': CHROME },
      '172.18.0.5',
    );

    expect(origin).toEqual({
      ipAddress: '41.33.1.1',
      countryCode: 'EG',
      userAgent: CHROME,
      os: 'Windows',
      browser: 'Chrome 130',
      deviceKind: 'DESKTOP',
    });
  });

  it('never trusts a client-typed X-Forwarded-For', async () => {
    const origin = await resolveSessionOrigin(
      { 'x-forwarded-for': '8.8.8.8', 'user-agent': 'curl/8.4.0' },
      '172.18.0.5',
    );

    expect(origin.ipAddress).not.toBe('8.8.8.8');
  });

  it('gives no country for a private address, and still records the address', async () => {
    const origin = await resolveSessionOrigin({ 'x-real-ip': '10.0.0.7' }, '172.18.0.5');

    expect(origin.countryCode).toBeNull();
  });

  it('records nulls, not guesses, when there is no user agent', async () => {
    const origin = await resolveSessionOrigin({}, undefined);

    expect(origin).toEqual({
      ipAddress: null,
      countryCode: null,
      userAgent: null,
      os: null,
      browser: null,
      deviceKind: null,
    });
  });

  it('takes the first of a repeated user-agent header and bounds it', async () => {
    const origin = await resolveSessionOrigin({ 'user-agent': [CHROME, 'x'] }, undefined);
    expect(origin.browser).toBe('Chrome 130');

    const huge = await resolveSessionOrigin({ 'user-agent': 'a'.repeat(5_000) }, undefined);
    expect(huge.userAgent?.length).toBe(512);
  });
});

describe('originOf', () => {
  it('copies only the origin columns of a session row', () => {
    const session = {
      id: 's',
      ipAddress: '1.2.3.4',
      countryCode: 'US',
      userAgent: 'UA',
      os: 'Linux',
      browser: 'Firefox 131',
      deviceKind: 'DESKTOP',
      refreshTokenHash: 'secret',
    };

    const origin = originOf(session as never);

    expect(origin).toEqual({
      ipAddress: '1.2.3.4',
      countryCode: 'US',
      userAgent: 'UA',
      os: 'Linux',
      browser: 'Firefox 131',
      deviceKind: 'DESKTOP',
    });
    expect(origin).not.toHaveProperty('refreshTokenHash');
  });
});
