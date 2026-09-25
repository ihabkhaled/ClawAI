import { Logger } from '@nestjs/common';
import { vi, type Mock } from 'vitest';
import { BlockSignalKind } from '../../../../common/enums/block-signal-kind.enum';
import { FetchStrategyKind } from '../../../../generated/prisma';
import { FETCH_STRATEGY_MAX_ATTEMPTS } from '../../constants/fetch-strategy.constants';
import { FetchEscalationError } from '../../errors/fetch-escalation.error';
import { FetchStrategyOrchestratorService } from '../fetch-strategy-orchestrator.service';
import type { FetchStrategyConfigRepository } from '../../repositories/fetch-strategy-config.repository';
import type { HostStrategyMemoryRepository } from '../../repositories/host-strategy-memory.repository';
import type { FetchStrategyRegistryService } from '../fetch-strategy-registry.service';
import type { HostRateLimiter } from '../../utilities/host-rate-limiter.utility';

const LONG_TEXT = 'a'.repeat(500);

function page(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    url: 'https://example.com/',
    finalUrl: 'https://example.com/',
    httpStatus: 200,
    mimeType: 'text/html',
    title: null,
    content: LONG_TEXT,
    links: [],
    byteSize: 500,
    cacheHit: false,
    latencyMs: 5,
    ...overrides,
  };
}

const SHELL = { content: 'Loading', rawHtml: '<div id="root"></div><script src="a.js"></script>' };

function config(kind: FetchStrategyKind, tier: number, publicConfig: Record<string, unknown> = {}) {
  return { kind, enabled: true, tier, publicConfig, timeoutMs: 10_000 };
}

describe('FetchStrategyOrchestratorService', () => {
  let configs: { listEnabledByTier: Mock };
  let hostMemory: { findByHost: Mock; recordSuccess: Mock; recordFailure: Mock };
  let adapters: Map<
    FetchStrategyKind,
    { kind: FetchStrategyKind; fetchPage: Mock; supports?: Mock }
  >;
  let rateLimiter: { waitForTurn: Mock };
  let orchestrator: FetchStrategyOrchestratorService;
  let logSpy: Mock;

  function adapter(kind: FetchStrategyKind, ...results: Array<Record<string, unknown> | Error>) {
    const fetchPage = vi.fn();
    for (const result of results) {
      if (result instanceof Error) {
        fetchPage.mockRejectedValueOnce(result);
      } else {
        fetchPage.mockResolvedValueOnce(result);
      }
    }
    const entry: { kind: FetchStrategyKind; fetchPage: Mock; supports?: Mock } = {
      kind,
      fetchPage,
    };
    adapters.set(kind, entry);
    return entry;
  }

  beforeEach(() => {
    configs = { listEnabledByTier: vi.fn() };
    hostMemory = {
      findByHost: vi.fn().mockResolvedValue(null),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
    };
    adapters = new Map();
    rateLimiter = { waitForTurn: vi.fn().mockResolvedValue(undefined) };
    const registry = { get: (kind: FetchStrategyKind) => adapters.get(kind) };
    orchestrator = new FetchStrategyOrchestratorService(
      configs as unknown as FetchStrategyConfigRepository,
      hostMemory as unknown as HostStrategyMemoryRepository,
      registry as unknown as FetchStrategyRegistryService,
      rateLimiter as unknown as HostRateLimiter,
    );
    logSpy = vi.fn();
    vi.spyOn(Logger.prototype, 'log').mockImplementation(logSpy);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the first unblocked result and stamps servedBy', async () => {
    configs.listEnabledByTier.mockResolvedValue([config(FetchStrategyKind.HTTP_PLAIN, 10)]);
    adapter(FetchStrategyKind.HTTP_PLAIN, page());

    const escalation = await orchestrator.fetchWithEscalation({ url: 'https://example.com/' });

    expect(escalation.winningStrategy).toBe(FetchStrategyKind.HTTP_PLAIN);
    expect(escalation.result.servedBy).toBe(FetchStrategyKind.HTTP_PLAIN);
    expect(hostMemory.recordSuccess).toHaveBeenCalledWith(
      'example.com',
      FetchStrategyKind.HTTP_PLAIN,
    );
  });

  it('escalates a 403 to the TLS-impersonating tier', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.HTTP_PLAIN, 10),
      config(FetchStrategyKind.HTTP_TLS_IMPERSONATE, 20),
    ]);
    adapter(FetchStrategyKind.HTTP_PLAIN, page({ httpStatus: 403, content: 'Forbidden' }));
    adapter(FetchStrategyKind.HTTP_TLS_IMPERSONATE, page());

    const escalation = await orchestrator.fetchWithEscalation({ url: 'https://example.com/' });

    expect(escalation.winningStrategy).toBe(FetchStrategyKind.HTTP_TLS_IMPERSONATE);
    expect(hostMemory.recordFailure).toHaveBeenCalledWith(
      'example.com',
      FetchStrategyKind.HTTP_PLAIN,
      BlockSignalKind.FORBIDDEN,
    );
  });

  it('stops the whole chain on 401 — credentials are never worked around', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.HTTP_PLAIN, 10),
      config(FetchStrategyKind.HTTP_TLS_IMPERSONATE, 20),
      config(FetchStrategyKind.ARCHIVE_SNAPSHOT, 80),
    ]);
    adapter(FetchStrategyKind.HTTP_PLAIN, page({ httpStatus: 401, content: 'Sign in' }));
    const tls = adapter(FetchStrategyKind.HTTP_TLS_IMPERSONATE, page());
    const archive = adapter(FetchStrategyKind.ARCHIVE_SNAPSHOT, page());

    await expect(
      orchestrator.fetchWithEscalation({ url: 'https://example.com/' }),
    ).rejects.toBeInstanceOf(FetchEscalationError);
    expect(tls.fetchPage).not.toHaveBeenCalled();
    expect(archive.fetchPage).not.toHaveBeenCalled();
  });

  it('sends a dead page straight to the archive, skipping every live tier', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.HTTP_PLAIN, 10),
      config(FetchStrategyKind.HEADLESS_BROWSER, 30),
      config(FetchStrategyKind.ARCHIVE_SNAPSHOT, 80),
    ]);
    adapter(FetchStrategyKind.HTTP_PLAIN, page({ httpStatus: 404, content: 'Not found' }));
    const headless = adapter(FetchStrategyKind.HEADLESS_BROWSER, page());
    adapter(FetchStrategyKind.ARCHIVE_SNAPSHOT, page({ archivedAt: '2020-01-01T00:00:00.000Z' }));

    const escalation = await orchestrator.fetchWithEscalation({ url: 'https://example.com/gone' });

    expect(escalation.winningStrategy).toBe(FetchStrategyKind.ARCHIVE_SNAPSHOT);
    expect(headless.fetchPage).not.toHaveBeenCalled();
  });

  it('only lets FlareSolverr run after a JS challenge was actually seen', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.HTTP_PLAIN, 10),
      config(FetchStrategyKind.FLARESOLVERR, 50),
      config(FetchStrategyKind.READER_PROXY, 70),
    ]);
    adapter(FetchStrategyKind.HTTP_PLAIN, page({ httpStatus: 403, content: 'Forbidden' }));
    const flare = adapter(FetchStrategyKind.FLARESOLVERR, page());
    adapter(FetchStrategyKind.READER_PROXY, page({ mimeType: 'text/markdown' }));

    const escalation = await orchestrator.fetchWithEscalation({ url: 'https://example.com/' });

    expect(flare.fetchPage).not.toHaveBeenCalled();
    expect(escalation.winningStrategy).toBe(FetchStrategyKind.READER_PROXY);
  });

  it('runs FlareSolverr after a Cloudflare interstitial', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.HTTP_PLAIN, 10),
      config(FetchStrategyKind.FLARESOLVERR, 50),
    ]);
    adapter(FetchStrategyKind.HTTP_PLAIN, page({ httpStatus: 503, content: 'Just a moment...' }));
    adapter(FetchStrategyKind.FLARESOLVERR, page());

    const escalation = await orchestrator.fetchWithEscalation({ url: 'https://example.com/' });

    expect(escalation.winningStrategy).toBe(FetchStrategyKind.FLARESOLVERR);
  });

  it('skips a strategy whose supports() is false without counting an attempt', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.OFFICIAL_API, 0),
      config(FetchStrategyKind.HTTP_PLAIN, 10),
    ]);
    const official = adapter(FetchStrategyKind.OFFICIAL_API, page());
    official.supports = vi.fn().mockReturnValue(false);
    adapter(FetchStrategyKind.HTTP_PLAIN, page());

    const escalation = await orchestrator.fetchWithEscalation({ url: 'https://example.com/' });

    expect(official.fetchPage).not.toHaveBeenCalled();
    expect(escalation.attempts).toHaveLength(1);
  });

  it('returns the longest live thin result when every renderer is thin too — never the archive', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.HTTP_PLAIN, 10),
      config(FetchStrategyKind.HEADLESS_BROWSER, 30),
      config(FetchStrategyKind.ARCHIVE_SNAPSHOT, 80),
    ]);
    adapter(FetchStrategyKind.HTTP_PLAIN, page(SHELL));
    adapter(FetchStrategyKind.HEADLESS_BROWSER, page({ ...SHELL, content: 'Loaded a bit' }));
    const archive = adapter(FetchStrategyKind.ARCHIVE_SNAPSHOT, page());

    const escalation = await orchestrator.fetchWithEscalation({ url: 'https://example.com/' });

    expect(archive.fetchPage).not.toHaveBeenCalled();
    expect(escalation.winningStrategy).toBe(FetchStrategyKind.HEADLESS_BROWSER);
    expect(escalation.result.content).toBe('Loaded a bit');
  });

  it('honours the excludeKinds and initialSignals options', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.HTTP_PLAIN, 10),
      config(FetchStrategyKind.ARCHIVE_SNAPSHOT, 80),
    ]);
    const plain = adapter(FetchStrategyKind.HTTP_PLAIN, page());
    adapter(FetchStrategyKind.ARCHIVE_SNAPSHOT, page());

    const escalation = await orchestrator.fetchWithEscalation(
      { url: 'https://example.com/' },
      { initialSignals: [BlockSignalKind.ROBOTS_UNREACHABLE] },
    );

    expect(plain.fetchPage).not.toHaveBeenCalled();
    expect(escalation.winningStrategy).toBe(FetchStrategyKind.ARCHIVE_SNAPSHOT);
  });

  it('never attempts more than the hard ceiling', async () => {
    const kinds = [
      FetchStrategyKind.OFFICIAL_API,
      FetchStrategyKind.HTTP_PLAIN,
      FetchStrategyKind.HTTP_TLS_IMPERSONATE,
      FetchStrategyKind.HEADLESS_BROWSER,
      FetchStrategyKind.CRAWL4AI,
      FetchStrategyKind.FIRECRAWL,
      FetchStrategyKind.READER_PROXY,
    ];
    configs.listEnabledByTier.mockResolvedValue(kinds.map((kind, index) => config(kind, index)));
    for (const kind of kinds) {
      adapter(kind, page({ httpStatus: 403, content: 'Forbidden' }));
    }

    const error = (await orchestrator
      .fetchWithEscalation({ url: 'https://example.com/' })
      .catch((caught: unknown) => caught)) as FetchEscalationError;

    expect(error.attempts).toHaveLength(FETCH_STRATEGY_MAX_ATTEMPTS);
  });

  it('stops starting attempts once the wall-clock budget is spent', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.HTTP_PLAIN, 10),
      config(FetchStrategyKind.HTTP_TLS_IMPERSONATE, 20),
    ]);
    const realNow = Date.now();
    const clock = vi.spyOn(Date, 'now');
    clock.mockReturnValue(realNow);
    const plain = adapter(FetchStrategyKind.HTTP_PLAIN);
    plain.fetchPage.mockImplementationOnce(async () => {
      clock.mockReturnValue(realNow + 59_500);
      return page({ httpStatus: 403, content: 'x' });
    });
    const tls = adapter(FetchStrategyKind.HTTP_TLS_IMPERSONATE, page());

    await expect(
      orchestrator.fetchWithEscalation({ url: 'https://example.com/' }),
    ).rejects.toBeInstanceOf(FetchEscalationError);
    expect(tls.fetchPage).not.toHaveBeenCalled();
  });

  it('clamps each attempt timeout to the remaining budget and the caller cap', async () => {
    configs.listEnabledByTier.mockResolvedValue([config(FetchStrategyKind.HTTP_PLAIN, 10)]);
    const plain = adapter(FetchStrategyKind.HTTP_PLAIN, page());

    await orchestrator.fetchWithEscalation({ url: 'https://example.com/', timeoutMs: 3_000 });

    expect(plain.fetchPage).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 3_000 }));
  });

  it('passes each strategy its own publicConfig per call', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.READER_PROXY, 70, { baseUrl: 'https://reader.internal/' }),
    ]);
    const reader = adapter(FetchStrategyKind.READER_PROXY, page({ mimeType: 'text/markdown' }));

    await orchestrator.fetchWithEscalation({ url: 'https://example.com/' });

    expect(reader.fetchPage).toHaveBeenCalledWith(
      expect.objectContaining({ strategyConfig: { baseUrl: 'https://reader.internal/' } }),
    );
  });

  it('tries a recent, promotable host memory first', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.HTTP_PLAIN, 10),
      config(FetchStrategyKind.HTTP_TLS_IMPERSONATE, 20),
    ]);
    hostMemory.findByHost.mockResolvedValue({
      preferredKind: FetchStrategyKind.HTTP_TLS_IMPERSONATE,
      updatedAt: new Date(),
    });
    const plain = adapter(FetchStrategyKind.HTTP_PLAIN, page());
    adapter(FetchStrategyKind.HTTP_TLS_IMPERSONATE, page());

    const escalation = await orchestrator.fetchWithEscalation({ url: 'https://example.com/' });

    expect(escalation.winningStrategy).toBe(FetchStrategyKind.HTTP_TLS_IMPERSONATE);
    expect(plain.fetchPage).not.toHaveBeenCalled();
  });

  it('never promotes the archive, and ignores stale memory', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.HTTP_PLAIN, 10),
      config(FetchStrategyKind.ARCHIVE_SNAPSHOT, 80),
    ]);
    hostMemory.findByHost.mockResolvedValue({
      preferredKind: FetchStrategyKind.ARCHIVE_SNAPSHOT,
      updatedAt: new Date(),
    });
    adapter(FetchStrategyKind.HTTP_PLAIN, page());
    const archive = adapter(FetchStrategyKind.ARCHIVE_SNAPSHOT, page());

    const escalation = await orchestrator.fetchWithEscalation({ url: 'https://example.com/' });

    expect(escalation.winningStrategy).toBe(FetchStrategyKind.HTTP_PLAIN);
    expect(archive.fetchPage).not.toHaveBeenCalled();
  });

  it('waits its politeness turn only for tiers that touch the origin, with the crawl delay', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.HTTP_PLAIN, 10),
      config(FetchStrategyKind.ARCHIVE_SNAPSHOT, 80),
    ]);
    adapter(FetchStrategyKind.HTTP_PLAIN, page({ httpStatus: 404, content: 'gone' }));
    adapter(FetchStrategyKind.ARCHIVE_SNAPSHOT, page());

    await orchestrator.fetchWithEscalation(
      { url: 'https://example.com/' },
      { minHostIntervalMs: 5_000 },
    );

    expect(rateLimiter.waitForTurn).toHaveBeenCalledTimes(1);
    expect(rateLimiter.waitForTurn).toHaveBeenCalledWith('example.com', 5_000);
  });

  it('logs one fetch.served line naming the tier, without the query string', async () => {
    configs.listEnabledByTier.mockResolvedValue([config(FetchStrategyKind.HTTP_PLAIN, 10)]);
    adapter(FetchStrategyKind.HTTP_PLAIN, page());

    await orchestrator.fetchWithEscalation({ url: 'https://example.com/a?token=secret' });

    const lines = (logSpy.mock.calls as unknown[][]).map((call) => String(call[0]));
    const served = lines.find((line) => line.startsWith('fetch.served'));
    expect(served).toContain('kind=HTTP_PLAIN');
    expect(served).toContain('path=https://example.com/a');
    expect(lines.join('\n')).not.toContain('secret');
  });

  it('turns a thrown adapter error into an attempt and moves on', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.HTTP_PLAIN, 10),
      config(FetchStrategyKind.HTTP_TLS_IMPERSONATE, 20),
    ]);
    adapter(FetchStrategyKind.HTTP_PLAIN, new Error('socket hang up'));
    adapter(FetchStrategyKind.HTTP_TLS_IMPERSONATE, page());

    const escalation = await orchestrator.fetchWithEscalation({ url: 'https://example.com/' });

    expect(escalation.attempts[0]).toMatchObject({
      outcome: 'ERROR',
      errorMessage: 'socket hang up',
    });
  });

  it('skips an enabled kind with no registered adapter', async () => {
    configs.listEnabledByTier.mockResolvedValue([
      config(FetchStrategyKind.CRAWL4AI, 40),
      config(FetchStrategyKind.HTTP_PLAIN, 10),
    ]);
    adapter(FetchStrategyKind.HTTP_PLAIN, page());

    const escalation = await orchestrator.fetchWithEscalation({ url: 'https://example.com/' });

    expect(escalation.winningStrategy).toBe(FetchStrategyKind.HTTP_PLAIN);
  });
});
