import { vi, type Mock } from 'vitest';
import { AppConfig } from '../../../../app/config/app.config';
import { BlockSignalKind } from '../../../../common/enums/block-signal-kind.enum';
import { ResearchErrorCode } from '../../../../common/enums/research-error-code.enum';
import { BusinessException } from '../../../../common/errors/business.exception';
import { FetchStrategyKind } from '../../../../generated/prisma';
import { FetchPurpose } from '../../enums/fetch-purpose.enum';
import { RobotsOutcome } from '../../enums/robots-outcome.enum';
import { FetchEscalationError } from '../../errors/fetch-escalation.error';
import { FetchService } from '../fetch.service';
import type { FetchStrategyOrchestratorService } from '../fetch-strategy-orchestrator.service';
import type { RobotsPolicyService } from '../robots-policy.service';
import type { FetchJobRepository } from '../../repositories/fetch-job.repository';
import type { PageCacheRepository } from '../../repositories/page-cache.repository';
import type { ResearchUsageService } from '../../../../common/services/research-usage.service';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn() },
}));

/**
 * FetchService is the ONE fetch entry point: every live fetch must pass the
 * robots gate and then go through the escalation chain. These pin the
 * wiring between the two — what reaches the orchestrator, with which
 * options, and what is persisted about the tier that served the page.
 */
describe('FetchService — robots gate and escalation wiring', () => {
  const appConfigGet = AppConfig.get as Mock;
  let orchestrator: { fetchWithEscalation: Mock };
  let robots: { evaluate: Mock };
  let jobs: { create: Mock; update: Mock };
  let cache: { findByKey: Mock; upsert: Mock };
  let service: FetchService;

  const served = {
    url: 'https://example.com/a',
    finalUrl: 'https://example.com/a',
    httpStatus: 200,
    mimeType: 'text/html',
    title: 'A',
    content: 'body',
    links: [],
    byteSize: 4,
    cacheHit: false,
    latencyMs: 3,
    servedBy: FetchStrategyKind.HTTP_TLS_IMPERSONATE,
  };

  function allowRobots(crawlDelayMs: number | null = null): void {
    robots.evaluate.mockResolvedValue({
      outcome: RobotsOutcome.ALLOWED,
      robotsUrl: 'https://example.com/robots.txt',
      crawlDelayMs,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue({
      RESEARCH_DOMAIN_ALLOWLIST: [],
      RESEARCH_DOMAIN_BLOCKLIST: [],
      RESEARCH_HEADLESS_RENDER_ENABLED: true,
    });
    orchestrator = { fetchWithEscalation: vi.fn(async () => ({ result: served, attempts: [] })) };
    robots = { evaluate: vi.fn() };
    allowRobots();
    jobs = { create: vi.fn(async () => ({ id: 'job-1' })), update: vi.fn(async () => ({})) };
    cache = { findByKey: vi.fn(async () => null), upsert: vi.fn(async () => ({})) };
    service = new FetchService(
      orchestrator as unknown as FetchStrategyOrchestratorService,
      robots as unknown as RobotsPolicyService,
      jobs as unknown as FetchJobRepository,
      cache as unknown as PageCacheRepository,
      { record: vi.fn(async () => {}) } as unknown as ResearchUsageService,
    );
  });

  it('refuses a robots-disallowed URL with FETCH_ROBOTS_DISALLOWED and runs no strategy', async () => {
    robots.evaluate.mockResolvedValue({
      outcome: RobotsOutcome.DISALLOWED,
      robotsUrl: 'https://example.com/robots.txt',
      crawlDelayMs: null,
    });

    const error = await service
      .fetchPage('user-1', { url: 'https://example.com/private' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BusinessException);
    expect((error as BusinessException).code).toBe(ResearchErrorCode.FETCH_ROBOTS_DISALLOWED);
    expect(orchestrator.fetchWithEscalation).not.toHaveBeenCalled();
  });

  it('starts the chain with ROBOTS_UNREACHABLE when robots.txt could not be read', async () => {
    robots.evaluate.mockResolvedValue({
      outcome: RobotsOutcome.UNREACHABLE,
      robotsUrl: 'https://example.com/robots.txt',
      crawlDelayMs: null,
    });

    await service.fetchPage('user-1', { url: 'https://example.com/a' });

    const [, options] = orchestrator.fetchWithEscalation.mock.calls[0] as [
      unknown,
      { initialSignals: unknown },
    ];
    expect(options.initialSignals).toEqual([BlockSignalKind.ROBOTS_UNREACHABLE]);
  });

  it('passes the robots Crawl-delay through as the host interval', async () => {
    allowRobots(4_000);

    await service.fetchPage('user-1', { url: 'https://example.com/a' });

    const [, options] = orchestrator.fetchWithEscalation.mock.calls[0] as [
      unknown,
      { minHostIntervalMs: number },
    ];
    expect(options.minHostIntervalMs).toBe(4_000);
  });

  it('excludes the in-process browser when the operator kill switch is off', async () => {
    appConfigGet.mockReturnValue({
      RESEARCH_DOMAIN_ALLOWLIST: [],
      RESEARCH_DOMAIN_BLOCKLIST: [],
      RESEARCH_HEADLESS_RENDER_ENABLED: false,
    });

    await service.fetchPage('user-1', { url: 'https://example.com/a' });

    const [, options] = orchestrator.fetchWithEscalation.mock.calls[0] as [
      unknown,
      { excludeKinds: string[] },
    ];
    expect(options.excludeKinds).toContain(FetchStrategyKind.HEADLESS_BROWSER);
  });

  it('lets only the two raw HTTP strategies serve a machine-readable fetch', async () => {
    await service.fetchPage(
      'user-1',
      { url: 'https://example.com/sitemap.xml' },
      FetchPurpose.MACHINE_READABLE,
    );

    const [, options] = orchestrator.fetchWithEscalation.mock.calls[0] as [
      unknown,
      { excludeKinds: string[] },
    ];
    expect(options.excludeKinds).not.toContain(FetchStrategyKind.HTTP_PLAIN);
    expect(options.excludeKinds).not.toContain(FetchStrategyKind.HTTP_TLS_IMPERSONATE);
    expect(options.excludeKinds).toContain(FetchStrategyKind.ARCHIVE_SNAPSHOT);
    expect(options.excludeKinds).toContain(FetchStrategyKind.READER_PROXY);
    expect(options.excludeKinds).toContain(FetchStrategyKind.HEADLESS_BROWSER);
  });

  it('records which tier served the page on the job row', async () => {
    await service.fetchPage('user-1', { url: 'https://example.com/a' });

    expect(jobs.update).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        servedBy: FetchStrategyKind.HTTP_TLS_IMPERSONATE,
        archivedAt: null,
      }),
    );
  });

  it('records the capture date of an archived copy', async () => {
    orchestrator.fetchWithEscalation.mockResolvedValue({
      result: {
        ...served,
        servedBy: FetchStrategyKind.ARCHIVE_SNAPSHOT,
        archivedAt: '2020-01-02T03:04:05.000Z',
      },
      attempts: [],
    });

    await service.fetchPage('user-1', { url: 'https://example.com/a' });

    expect(jobs.update).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ archivedAt: new Date('2020-01-02T03:04:05.000Z') }),
    );
  });

  it('reports the signals and strategies tried when the whole chain fails', async () => {
    orchestrator.fetchWithEscalation.mockRejectedValue(
      new FetchEscalationError(
        'none',
        [
          {
            kind: FetchStrategyKind.HTTP_PLAIN,
            outcome: 'BLOCKED',
            blockSignal: BlockSignalKind.AUTH_REQUIRED,
            durationMs: 1,
          },
        ],
        [BlockSignalKind.AUTH_REQUIRED],
      ),
    );

    const error = (await service
      .fetchPage('user-1', { url: 'https://example.com/a' })
      .catch((caught: unknown) => caught)) as BusinessException;

    expect(error.code).toBe(ResearchErrorCode.FETCH_FAILED);
    expect(error.details).toMatchObject({
      signals: [BlockSignalKind.AUTH_REQUIRED],
      strategiesTried: [FetchStrategyKind.HTTP_PLAIN],
    });
  });
});
