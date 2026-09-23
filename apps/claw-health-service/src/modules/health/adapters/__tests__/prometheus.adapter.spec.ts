import { vi } from 'vitest';
import { httpGet } from '@common/utilities';

import { PROMETHEUS_QUERY_TIMEOUT_MS } from '../../constants/status-page.constants';
import { PrometheusAdapter } from '../prometheus.adapter';

vi.mock('@common/utilities', () => ({
  httpGet: vi.fn(),
  declaredHost: (baseUrl: string) => new Set([new URL(baseUrl).host]),
}));

const mockedGet = vi.mocked(httpGet);

describe('PrometheusAdapter', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('calls query_range once, with a timeout and the Prometheus host declared', async () => {
    mockedGet.mockResolvedValue({
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: { service: 'auth-service' },
            values: [
              [1_800_000_000, '0'],
              [1_800_000_300.0004, '0'],
            ],
          },
        ],
      },
    });

    const series = await new PrometheusAdapter().queryRange('up == 0', 100, 400, 300);

    expect(mockedGet).toHaveBeenCalledOnce();
    const [url, config, hosts] = mockedGet.mock.calls[0] ?? [];
    const parsed = new URL(String(url));
    expect(parsed.host).toBe('prometheus:9090');
    expect(parsed.pathname).toBe('/api/v1/query_range');
    expect(parsed.searchParams.get('query')).toBe('up == 0');
    expect(parsed.searchParams.get('start')).toBe('100');
    expect(parsed.searchParams.get('step')).toBe('300');
    expect(config).toEqual({ timeout: PROMETHEUS_QUERY_TIMEOUT_MS });
    expect(hosts).toEqual(new Set(['prometheus:9090']));
    expect(series).toEqual([
      { labels: { service: 'auth-service' }, timestamps: [1_800_000_000, 1_800_000_300] },
    ]);
  });

  it('rejects an answer that is not a successful matrix instead of reading zeros from it', async () => {
    mockedGet.mockResolvedValue({ status: 'error', errorType: 'bad_data', error: 'parse error' });

    await expect(new PrometheusAdapter().queryRange('up', 0, 300, 300)).rejects.toThrow();
  });
});
