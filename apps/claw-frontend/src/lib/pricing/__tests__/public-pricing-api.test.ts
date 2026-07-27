import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchPublicPricingCatalog, getAuthServiceOrigin } from '@/lib/pricing/public-pricing-api';

describe('public pricing API', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('normalizes the configured auth service origin', () => {
    vi.stubEnv('AUTH_SERVICE_URL', 'http://auth:3001/');
    expect(getAuthServiceOrigin()).toBe('http://auth:3001');
  });

  it('returns null without exposing an unauthenticated internal request', async () => {
    vi.stubEnv('AUTH_SERVICE_URL', 'http://auth:3001');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', '');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(fetchPublicPricingCatalog()).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches the catalog with service authentication and no cache', async () => {
    vi.stubEnv('AUTH_SERVICE_URL', 'http://auth:3001/');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'service-secret');
    const response = new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);

    await expect(fetchPublicPricingCatalog()).resolves.toEqual([]);
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://auth:3001/api/v1/internal/plans/catalog',
      expect.objectContaining({
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: 'Service service-secret',
        },
      }),
    );
  });
});
