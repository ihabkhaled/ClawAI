import { vi } from 'vitest';
import { UserIdentityClient } from '../user-identity.client';

const httpRequest = vi.hoisted(() => vi.fn());
// A plain function, not a vi.fn: this vitest reports any throw from a vi.fn as a
// test failure even when the code under test catches it.
const hostGuard = vi.hoisted(() => ({ fail: false }));

vi.mock('@claw/shared-utilities', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  httpRequest,
  declaredHost: (url: string): string[] => {
    if (hostGuard.fail) {
      throw new Error('boom');
    }
    return [new URL(url).host];
  },
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: () => ({
      AUTH_SERVICE_URL: 'https://auth-service:4001',
      INTER_SERVICE_AUTH_TOKEN: 'svc-token',
    }),
  },
}));

describe('UserIdentityClient.fullName', () => {
  beforeEach(() => {
    httpRequest.mockReset();
    hostGuard.fail = false;
  });

  it('joins first and last name from the auth-service route using the service token', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { firstName: 'Ada', lastName: 'Lovelace' },
    });

    await expect(new UserIdentityClient().fullName('user 1')).resolves.toBe('Ada Lovelace');

    const options = httpRequest.mock.calls[0]?.[0] as {
      url: string;
      headers: Record<string, string>;
    };
    expect(options.url).toBe('https://auth-service:4001/api/v1/internal/users/user%201/identity');
    expect(options.headers.Authorization).toBe('Service svc-token');
  });

  it('uses whichever half exists', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { firstName: 'Ada', lastName: null },
    });
    await expect(new UserIdentityClient().fullName('u')).resolves.toBe('Ada');
  });

  it('returns null when the profile has no name', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { firstName: null, lastName: '  ' },
    });
    await expect(new UserIdentityClient().fullName('u')).resolves.toBeNull();
  });

  it('returns null on a non-ok answer', async () => {
    httpRequest.mockResolvedValue({ ok: false, status: 404, data: {} });
    await expect(new UserIdentityClient().fullName('u')).resolves.toBeNull();
  });

  it('returns null, never throws, when the call fails', async () => {
    hostGuard.fail = true;
    await expect(new UserIdentityClient().fullName('u')).resolves.toBeNull();
  });
});
