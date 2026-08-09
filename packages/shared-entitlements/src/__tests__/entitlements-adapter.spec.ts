import { EntitlementsAdapter, EntitlementsRequestError } from '../entitlements-adapter';

describe('EntitlementsAdapter feature usage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records a research request through the auth-service ledger endpoint', async () => {
    const request = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));
    const adapter = new EntitlementsAdapter({ authServiceUrl: 'http://auth:4001/' });

    await adapter.recordFeatureUsage({
      userId: 'user-1',
      feature: 'WEB_SEARCH',
      requestId: 'search-run-1:provider-1',
    });

    expect(request).toHaveBeenCalledWith(
      'http://auth:4001/api/v1/internal/quota/features/consume',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-1',
          feature: 'WEB_SEARCH',
          requestId: 'search-run-1:provider-1',
        }),
      }),
    );
  });

  it('preserves a bounded auth business error code', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ errorCode: 'PLAN_TRIAL_EXPIRED' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const adapter = new EntitlementsAdapter({ authServiceUrl: 'http://auth:4001' });
    await expect(adapter.reserveQuota('user-1', 1)).rejects.toEqual(
      new EntitlementsRequestError(403, 'PLAN_TRIAL_EXPIRED'),
    );
  });
});
