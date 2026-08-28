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

describe('EntitlementsAdapter transport retry', () => {
  const url = 'https://auth-service:4001';
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function transportError(): Error {
    // What undici throws when a pooled socket is dead: a bare TypeError with
    // the real code hidden on `.cause`.
    const error = new TypeError('fetch failed');
    (error as { cause?: unknown }).cause = { code: 'UND_ERR_SOCKET' };
    return error;
  }

  it('retries once when the connection never carried a response', async () => {
    // An upstream restart kills pooled keep-alive sockets, each failing once as
    // it is discovered dead. Without this the burst surfaced as user-visible
    // 503s on writes that would otherwise have succeeded.
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(transportError())
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ userId: 'u1' }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new EntitlementsAdapter({ authServiceUrl: url });
    await expect(adapter.getEntitlements('u1')).resolves.toEqual({ userId: 'u1' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after one retry rather than hammering a dead upstream', async () => {
    const fetchMock = jest.fn().mockRejectedValue(transportError());
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new EntitlementsAdapter({ authServiceUrl: url });
    await expect(adapter.getEntitlements('u1')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a response the server actually sent', async () => {
    // A 500 means auth-service answered. Its answer stands; repeating it would
    // just double the load on something already struggling.
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500, json: async () => null });
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new EntitlementsAdapter({ authServiceUrl: url });
    await expect(adapter.getEntitlements('u1')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry the caller-imposed timeout', async () => {
    const abort = new Error('The operation was aborted');
    abort.name = 'AbortError';
    const fetchMock = jest.fn().mockRejectedValue(abort);
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new EntitlementsAdapter({ authServiceUrl: url });
    await expect(adapter.getEntitlements('u1')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never retries a quota reservation', async () => {
    // Retrying a reserve would double-charge. Only the idempotent GET repeats.
    const fetchMock = jest.fn().mockRejectedValue(transportError());
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new EntitlementsAdapter({ authServiceUrl: url });
    await expect(adapter.reserveQuota('u1', 100)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
