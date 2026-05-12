import { fetchSnapshot } from '../utilities/snapshot-fetcher.utility';

const originalFetch = globalThis.fetch;

describe('fetchSnapshot', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns OK with models on 200', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ models: [{ provider: 'X', modelKey: 'm', displayName: 'M' }] }),
    }) as unknown as typeof fetch;

    const result = await fetchSnapshot('http://test/snapshot');
    expect(result.status).toBe('OK');
    if (result.status === 'OK') {
      expect(result.models).toHaveLength(1);
      expect(result.models[0]!.modelKey).toBe('m');
    }
  });

  it('returns UPSTREAM_404 when endpoint not yet implemented', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    const result = await fetchSnapshot('http://test/snapshot');
    expect(result.status).toBe('UPSTREAM_404');
  });

  it('returns UPSTREAM_ERROR on 500', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'boom' }),
    }) as unknown as typeof fetch;

    const result = await fetchSnapshot('http://test/snapshot');
    expect(result.status).toBe('UPSTREAM_ERROR');
    if (result.status === 'UPSTREAM_ERROR') {
      expect(result.message).toContain('HTTP 500');
    }
  });

  it('returns UPSTREAM_ERROR when fetch throws (network)', async () => {
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

    const result = await fetchSnapshot('http://test/snapshot');
    expect(result.status).toBe('UPSTREAM_ERROR');
    if (result.status === 'UPSTREAM_ERROR') {
      expect(result.message).toContain('ECONNREFUSED');
    }
  });

  it('treats missing models field as empty array', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    const result = await fetchSnapshot('http://test/snapshot');
    expect(result.status).toBe('OK');
    if (result.status === 'OK') {
      expect(result.models).toEqual([]);
    }
  });
});
