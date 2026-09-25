import { type Mock, vi } from 'vitest';

import { FetchStrategyKind } from '../../../../generated/prisma';
import { SIDECAR_HEALTH_CACHE_TTL_MS } from '../../constants/fetch-strategy.constants';
import { SidecarHealthState } from '../../enums/sidecar-health-state.enum';
import { SidecarHealthService } from '../sidecar-health.service';

// Real config rows as the bootstrap seeds them (ADR-121): the sidecars start
// DISABLED with their compose-name base URL in publicConfig.
const row = (kind: FetchStrategyKind, enabled: boolean, baseUrl: string) => ({
  id: `row-${kind}`,
  kind,
  enabled,
  tier: 40,
  timeoutMs: 45_000,
  publicConfig: { baseUrl },
  createdAt: new Date('2026-09-25T00:00:00Z'),
  updatedAt: new Date('2026-09-25T00:00:00Z'),
});

const SEEDED = [
  row(FetchStrategyKind.HTTP_PLAIN, true, 'unused'),
  row(FetchStrategyKind.CRAWL4AI, false, 'http://crawl4ai:11235'),
  row(FetchStrategyKind.FLARESOLVERR, false, 'http://flaresolverr:8191'),
  row(FetchStrategyKind.FIRECRAWL, false, 'http://firecrawl-api:3002'),
];

// What each sidecar really answers on its probe route.
const CRAWL4AI_HEALTH = { status: 'ok', timestamp: 1_790_000_000, version: '0.9.4' };
const FLARESOLVERR_ROOT = {
  msg: 'FlareSolverr is ready!',
  version: '3.5.2',
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/142.0.0.0 Safari/537.36',
};
const FIRECRAWL_ROOT = 'SCRAPERS-JS: Hello, world! K8s!';

const answer = (body: unknown, status = 200): Response =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

describe('SidecarHealthService', () => {
  let repository: { listAll: Mock };
  let fetchMock: Mock;
  let service: SidecarHealthService;

  beforeEach(() => {
    repository = { listAll: vi.fn() };
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    service = new SidecarHealthService(repository as never);
  });

  it('reports every sidecar DISABLED, and probes nothing, while they are seeded off', async () => {
    repository.listAll.mockResolvedValue(SEEDED);

    const report = await service.report(0);

    expect(report).toEqual({
      crawl4ai: SidecarHealthState.DISABLED,
      flaresolverr: SidecarHealthState.DISABLED,
      firecrawl: SidecarHealthState.DISABLED,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('probes each ENABLED sidecar on its cheap route and reports up', async () => {
    repository.listAll.mockResolvedValue(SEEDED.map((entry) => ({ ...entry, enabled: true })));
    const bodies = new Map<string, unknown>([
      ['http://crawl4ai:11235/health', CRAWL4AI_HEALTH],
      ['http://flaresolverr:8191/', FLARESOLVERR_ROOT],
      ['http://firecrawl-api:3002/', FIRECRAWL_ROOT],
    ]);
    fetchMock.mockImplementation((url: string) =>
      bodies.has(url)
        ? Promise.resolve(answer(bodies.get(url)))
        : Promise.reject(new Error(`unexpected ${url}`)),
    );

    const report = await service.report(0);

    expect(report).toEqual({
      crawl4ai: SidecarHealthState.UP,
      flaresolverr: SidecarHealthState.UP,
      firecrawl: SidecarHealthState.UP,
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('GET');
    expect(init.redirect).toBe('error');
    // No credential on a health probe: Crawl4AI's /health is unauthenticated.
    expect(init.headers).toBeUndefined();
  });

  it('reports DOWN on a refused connection, a timeout or a non-2xx', async () => {
    repository.listAll.mockResolvedValue(SEEDED.map((entry) => ({ ...entry, enabled: true })));
    const failures = new Map<string, Error>([
      ['crawl4ai', new TypeError('fetch failed: ECONNREFUSED')],
      ['flaresolverr', new DOMException('timed out', 'TimeoutError')],
    ]);
    fetchMock.mockImplementation((url: string) => {
      const failure = [...failures].find(([host]) => url.includes(host))?.[1];
      return failure === undefined
        ? Promise.resolve(answer({ error: 'bad gateway' }, 502))
        : Promise.reject(failure);
    });

    const report = await service.report(0);

    expect(report).toEqual({
      crawl4ai: SidecarHealthState.DOWN,
      flaresolverr: SidecarHealthState.DOWN,
      firecrawl: SidecarHealthState.DOWN,
    });
  });

  it('probes the admin-configured base URL, and never a metadata host', async () => {
    repository.listAll.mockResolvedValue([
      row(FetchStrategyKind.CRAWL4AI, true, 'http://scraper-box:9000'),
      row(FetchStrategyKind.FLARESOLVERR, true, 'http://169.254.169.254'),
    ]);
    fetchMock.mockResolvedValue(answer(CRAWL4AI_HEALTH));

    const report = await service.report(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://scraper-box:9000/health');
    expect(report['flaresolverr']).toBe(SidecarHealthState.DOWN);
    // A missing row (never seeded) is disabled, not an outage.
    expect(report['firecrawl']).toBe(SidecarHealthState.DISABLED);
  });

  it('reuses a report inside the TTL and probes again after it', async () => {
    repository.listAll.mockResolvedValue(SEEDED);

    await service.report(0);
    await service.report(SIDECAR_HEALTH_CACHE_TTL_MS - 1);
    expect(repository.listAll).toHaveBeenCalledTimes(1);

    await service.report(SIDECAR_HEALTH_CACHE_TTL_MS);
    expect(repository.listAll).toHaveBeenCalledTimes(2);
  });

  it('reports nothing (not measured) when the config table cannot be read', async () => {
    repository.listAll.mockRejectedValue(new Error('db down'));

    await expect(service.report(0)).resolves.toEqual({});
  });
});
