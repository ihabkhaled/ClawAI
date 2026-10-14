import { vi } from 'vitest';

import { AuthProfileClient } from '../clients/auth-profile.client';

const httpRequest = vi.hoisted(() => vi.fn());

vi.mock('@claw/shared-utilities', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  httpRequest,
  declaredHost: (url: string): string[] => [new URL(url).host],
}));

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: () => ({
      AUTH_SERVICE_URL: 'https://auth-service:4001',
      INTER_SERVICE_AUTH_TOKEN: 'svc-token',
    }),
  },
}));

const profile = { id: 'u1', username: 'ada', displayName: 'Ada Lovelace' };

describe('AuthProfileClient', () => {
  beforeEach(() => {
    httpRequest.mockReset();
  });

  it('posts the ids to the public-profiles route with the service token and a short timeout', async () => {
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: [profile] });
    await expect(new AuthProfileClient().fetchProfiles(['u1'])).resolves.toEqual([profile]);
    const options = httpRequest.mock.calls[0]?.[0] as {
      url: string;
      method: string;
      body: unknown;
      timeoutMs: number;
      headers: Record<string, string>;
    };
    expect(options.url).toBe('https://auth-service:4001/api/v1/internal/users/public-profiles');
    expect(options.method).toBe('POST');
    expect(options.body).toEqual({ ids: ['u1'] });
    expect(options.timeoutMs).toBeLessThanOrEqual(3000);
    expect(options.headers.Authorization).toBe('Service svc-token');
  });

  it('does not call out for an empty batch', async () => {
    await expect(new AuthProfileClient().fetchProfiles([])).resolves.toEqual([]);
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it('degrades to an empty answer on a bad status, a bad shape or a thrown error', async () => {
    const client = new AuthProfileClient();
    httpRequest.mockResolvedValueOnce({ ok: false, status: 500, data: {} });
    await expect(client.fetchProfiles(['u1'])).resolves.toEqual([]);
    httpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: [{ id: 'u1', email: 'x' }] });
    await expect(client.fetchProfiles(['u1'])).resolves.toEqual([]);
    httpRequest.mockRejectedValueOnce(new Error('timeout'));
    await expect(client.fetchProfiles(['u1'])).resolves.toEqual([]);
  });

  it('looks a username up encoded, and answers null for 404, a bad shape and errors', async () => {
    const client = new AuthProfileClient();
    httpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: profile });
    await expect(client.fetchByUsername('a b')).resolves.toEqual(profile);
    expect((httpRequest.mock.calls[0]?.[0] as { url: string }).url).toBe(
      'https://auth-service:4001/api/v1/internal/users/by-username/a%20b',
    );
    httpRequest.mockResolvedValueOnce({ ok: false, status: 404, data: {} });
    await expect(client.fetchByUsername('ghost')).resolves.toBeNull();
    httpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: { id: 1 } });
    await expect(client.fetchByUsername('ghost')).resolves.toBeNull();
    httpRequest.mockRejectedValueOnce(new Error('down'));
    await expect(client.fetchByUsername('ghost')).resolves.toBeNull();
  });
});
