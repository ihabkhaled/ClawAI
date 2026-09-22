import { vi } from 'vitest';
import { fetchSnapshot } from '../utilities/snapshot-fetcher.utility';

const originalFetch = globalThis.fetch;

/**
 * The outbound guard's host check is unconditional, so a test fetching from a
 * made-up host declares it exactly as the manager declares its service
 * defaults. Relying on the allowlist being empty only holds on a machine whose
 * environment names no services; a CI runner defines `_ENDPOINT` variables, so
 * these five refused there and passed here.
 */
const TEST_HOSTS: ReadonlySet<string> = new Set(['test']);

describe('fetchSnapshot', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns OK with models on 200', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ models: [{ provider: 'X', modelKey: 'm', displayName: 'M' }] }),
    }) as unknown as typeof fetch;

    const result = await fetchSnapshot('http://test/snapshot', TEST_HOSTS);
    expect(result.status).toBe('OK');
    if (result.status === 'OK') {
      expect(result.models).toHaveLength(1);
      expect(result.models[0]!.modelKey).toBe('m');
    }
  });

  it('returns UPSTREAM_404 when endpoint not yet implemented', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    const result = await fetchSnapshot('http://test/snapshot', TEST_HOSTS);
    expect(result.status).toBe('UPSTREAM_404');
  });

  it('returns UPSTREAM_ERROR on 500', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'boom' }),
    }) as unknown as typeof fetch;

    const result = await fetchSnapshot('http://test/snapshot', TEST_HOSTS);
    expect(result.status).toBe('UPSTREAM_ERROR');
    if (result.status === 'UPSTREAM_ERROR') {
      expect(result.message).toContain('HTTP 500');
    }
  });

  it('returns UPSTREAM_ERROR when fetch throws (network)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

    const result = await fetchSnapshot('http://test/snapshot', TEST_HOSTS);
    expect(result.status).toBe('UPSTREAM_ERROR');
    if (result.status === 'UPSTREAM_ERROR') {
      expect(result.message).toContain('ECONNREFUSED');
    }
  });

  it('treats missing models field as empty array', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    const result = await fetchSnapshot('http://test/snapshot', TEST_HOSTS);
    expect(result.status).toBe('OK');
    if (result.status === 'OK') {
      expect(result.models).toEqual([]);
    }
  });
});
