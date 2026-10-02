import { vi } from 'vitest';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { type UserAccessTokenPayload, UserRole } from '@claw/shared-types';
import { verifyUserAccessToken } from '@claw/shared-utilities';

import {
  buildThrottlerOptions,
  isInterServiceContext,
  isInterServiceRequest,
  resolveThrottleTracker,
} from '../throttle-tracker';
import { resetTrustedProxyCache } from '../trusted-proxy';

vi.mock('@claw/shared-utilities', () => ({
  verifyUserAccessToken: vi.fn(),
}));
const { mockedLookup } = vi.hoisted(() => ({
  mockedLookup:
    vi.fn<
      (hostname: string, options: { all: true }) => Promise<{ address: string; family: number }[]>
    >(),
}));
vi.mock('node:dns/promises', () => ({ lookup: mockedLookup }));

const mockedVerify = vi.mocked(verifyUserAccessToken);
const SERVICE_TOKEN = 'inter-service-token-for-tests-0123456789';
// The docker address `nginx` resolves to in these tests.
const NGINX_PEER = '::ffff:172.18.0.9';

function payload(sub: string): UserAccessTokenPayload {
  return { sub, email: 'u@example.com', role: UserRole.USER, tokenKind: 'user', sessionId: 's1' };
}

function request(
  headers: Record<string, string | string[]>,
  remoteAddress: string | undefined = NGINX_PEER,
): Record<string, unknown> {
  return { headers, ip: remoteAddress, socket: { remoteAddress } };
}

describe('resolveThrottleTracker', () => {
  const originalSecret = process.env['JWT_SECRET'];

  beforeEach(() => {
    process.env['JWT_SECRET'] = 'jwt-secret-for-tests';
    resetTrustedProxyCache();
    mockedLookup.mockReset();
    mockedLookup.mockResolvedValue([{ address: '172.18.0.9', family: 4 }]);
    mockedVerify.mockReset();
    mockedVerify.mockImplementation(() => {
      throw new Error('invalid token');
    });
  });

  afterAll(() => {
    process.env['JWT_SECRET'] = originalSecret;
  });

  it('keys on the X-Real-IP nginx wrote when the peer IS nginx', async () => {
    await expect(resolveThrottleTracker(request({ 'x-real-ip': '203.0.113.7' }))).resolves.toBe(
      'ip:203.0.113.7',
    );
    expect(mockedLookup).toHaveBeenCalledWith('nginx', { all: true });
  });

  it('ignores a spoofed left-most X-Forwarded-For entry', async () => {
    const tracker = await resolveThrottleTracker(
      request({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '1.2.3.4, 203.0.113.7' }),
    );
    expect(tracker).toBe('ip:203.0.113.7');
  });

  it('never keys on X-Forwarded-For alone', async () => {
    await expect(resolveThrottleTracker(request({ 'x-forwarded-for': '1.2.3.4' }))).resolves.toBe(
      'peer:172.18.0.9',
    );
  });

  it('distrusts X-Real-IP from a public peer (a direct hit on a published port)', async () => {
    await expect(
      resolveThrottleTracker(request({ 'x-real-ip': '1.2.3.4' }, '198.51.100.20')),
    ).resolves.toBe('peer:198.51.100.20');
  });

  it('counts a LAN client spoofing X-Real-IP on a published port by its own address', async () => {
    const first = await resolveThrottleTracker(
      request({ 'x-real-ip': '203.0.113.1' }, '192.168.1.50'),
    );
    const second = await resolveThrottleTracker(
      request({ 'x-real-ip': '203.0.113.2' }, '192.168.1.50'),
    );
    expect([first, second]).toEqual(['peer:192.168.1.50', 'peer:192.168.1.50']);
  });

  it('counts another container on claw-network by its own address', async () => {
    await expect(
      resolveThrottleTracker(request({ 'x-real-ip': '203.0.113.7' }, '172.18.0.44')),
    ).resolves.toBe('peer:172.18.0.44');
  });

  it('ignores an X-Real-IP that is not an address', async () => {
    await expect(resolveThrottleTracker(request({ 'x-real-ip': 'not-an-ip' }))).resolves.toBe(
      'peer:172.18.0.9',
    );
  });

  it('reads the first value when a header arrives as an array', async () => {
    await expect(
      resolveThrottleTracker(request({ 'x-real-ip': ['203.0.113.8', '9.9.9.9'] })),
    ).resolves.toBe('ip:203.0.113.8');
  });

  it('keys a valid user token on the user, not the address', async () => {
    mockedVerify.mockReturnValue(payload('user-42'));
    const tracker = await resolveThrottleTracker(
      request({ authorization: 'Bearer good.jwt.token', 'x-real-ip': '203.0.113.7' }),
    );
    expect(tracker).toBe('user:user-42');
    expect(mockedVerify).toHaveBeenCalledWith('good.jwt.token', 'jwt-secret-for-tests');
  });

  it('falls back to the address for an invalid or expired token', async () => {
    const tracker = await resolveThrottleTracker(
      request({ authorization: 'Bearer forged', 'x-real-ip': '203.0.113.7' }),
    );
    expect(tracker).toBe('ip:203.0.113.7');
  });

  it('does not verify when JWT_SECRET is unset', async () => {
    process.env['JWT_SECRET'] = '';
    await resolveThrottleTracker(request({ authorization: 'Bearer good.jwt.token' }));
    expect(mockedVerify).not.toHaveBeenCalled();
  });

  it('does not verify an oversized authorization header', async () => {
    await resolveThrottleTracker(request({ authorization: `Bearer ${'a'.repeat(20_000)}` }));
    expect(mockedVerify).not.toHaveBeenCalled();
  });

  it('keys an internal caller with no X-Real-IP on its own docker address', async () => {
    await expect(resolveThrottleTracker(request({}, '::ffff:172.18.0.21'))).resolves.toBe(
      'peer:172.18.0.21',
    );
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('never trusts X-Real-IP when the peer is unknown', async () => {
    await expect(resolveThrottleTracker({ headers: { 'x-real-ip': '203.0.113.7' } })).resolves.toBe(
      'peer:unknown',
    );
  });

  it('returns a stable unknown key when nothing identifies the caller', async () => {
    await expect(resolveThrottleTracker({})).resolves.toBe('peer:unknown');
  });

  it('skips non-string header values', async () => {
    await expect(
      resolveThrottleTracker({ headers: { 'x-real-ip': 7 }, ip: '10.0.0.3' }),
    ).resolves.toBe('peer:10.0.0.3');
  });

  it('normalises upper-case header names', async () => {
    await expect(resolveThrottleTracker(request({ 'X-Real-IP': '203.0.113.9' }))).resolves.toBe(
      'ip:203.0.113.9',
    );
  });
});

describe('isInterServiceRequest', () => {
  const originalToken = process.env['INTER_SERVICE_AUTH_TOKEN'];

  beforeEach(() => {
    process.env['INTER_SERVICE_AUTH_TOKEN'] = SERVICE_TOKEN;
  });

  afterAll(() => {
    process.env['INTER_SERVICE_AUTH_TOKEN'] = originalToken;
  });

  it('accepts the exact inter-service token', () => {
    expect(isInterServiceRequest({ authorization: `Service ${SERVICE_TOKEN}` })).toBe(true);
  });

  it('rejects a wrong token, so a visitor cannot opt out of the limit', () => {
    expect(isInterServiceRequest({ authorization: 'Service guessed' })).toBe(false);
  });

  it('rejects a Bearer token and a missing header', () => {
    expect(isInterServiceRequest({ authorization: `Bearer ${SERVICE_TOKEN}` })).toBe(false);
    expect(isInterServiceRequest({})).toBe(false);
  });

  it('never skips when the token is not configured', () => {
    process.env['INTER_SERVICE_AUTH_TOKEN'] = '';
    expect(isInterServiceRequest({ authorization: 'Service ' })).toBe(false);
  });

  it('rejects an oversized header without hashing it', () => {
    expect(isInterServiceRequest({ authorization: `Service ${'x'.repeat(20_000)}` })).toBe(false);
  });
});

describe('isInterServiceContext', () => {
  beforeEach(() => {
    process.env['INTER_SERVICE_AUTH_TOKEN'] = SERVICE_TOKEN;
  });

  it('skips an HTTP call carrying the service token', () => {
    const context = new ExecutionContextHost([
      { headers: { authorization: `Service ${SERVICE_TOKEN}` } },
    ]);
    expect(isInterServiceContext(context)).toBe(true);
  });

  it('does not skip an ordinary HTTP call', () => {
    const context = new ExecutionContextHost([{ headers: {} }]);
    expect(isInterServiceContext(context)).toBe(false);
  });

  it('does not skip a request object with no headers', () => {
    expect(isInterServiceContext(new ExecutionContextHost([undefined]))).toBe(false);
  });

  it('does not skip a non-HTTP context', () => {
    const context = new ExecutionContextHost([{}]);
    context.setType('rpc');
    expect(isInterServiceContext(context)).toBe(false);
  });
});

describe('buildThrottlerOptions', () => {
  it('wires the window, the tracker and the inter-service skip', () => {
    const options = buildThrottlerOptions({ ttl: 60_000, limit: 2_500 });
    expect(options.throttlers).toEqual([{ ttl: 60_000, limit: 2_500 }]);
    expect(options.getTracker).toBe(resolveThrottleTracker);
    expect(options.skipIf).toBe(isInterServiceContext);
  });
});
