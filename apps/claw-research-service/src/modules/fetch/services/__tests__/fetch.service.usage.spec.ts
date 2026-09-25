import { vi, type Mock } from 'vitest';
import { AppConfig } from '../../../../app/config/app.config';
import { RobotsOutcome } from '../../enums/robots-outcome.enum';
import { FetchService } from '../fetch.service';
import type { FetchStrategyOrchestratorService } from '../fetch-strategy-orchestrator.service';
import type { RobotsPolicyService } from '../robots-policy.service';
import type { FetchJobRepository } from '../../repositories/fetch-job.repository';
import type { PageCacheRepository } from '../../repositories/page-cache.repository';
import type { ResearchUsageService } from '../../../../common/services/research-usage.service';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn() },
}));

describe('FetchService usage accounting', () => {
  const appConfigGet = AppConfig.get as Mock;
  let orchestrator: { fetchWithEscalation: Mock };
  let robots: { evaluate: Mock };
  let jobs: { create: Mock; update: Mock };
  let cache: { findByKey: Mock; upsert: Mock };
  let usage: { record: Mock };
  let service: FetchService;

  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue({
      RESEARCH_DOMAIN_ALLOWLIST: [],
      RESEARCH_DOMAIN_BLOCKLIST: [],
      RESEARCH_HEADLESS_RENDER_ENABLED: true,
    });
    orchestrator = { fetchWithEscalation: vi.fn() };
    robots = {
      evaluate: vi.fn(async () => ({
        outcome: RobotsOutcome.ALLOWED,
        robotsUrl: 'https://example.com/robots.txt',
        crawlDelayMs: null,
      })),
    };
    jobs = {
      create: vi.fn(async () => ({ id: 'fetch-job-1' })),
      update: vi.fn(async () => ({})),
    };
    cache = { findByKey: vi.fn(async () => null), upsert: vi.fn(async () => ({})) };
    usage = { record: vi.fn(async () => {}) };
    service = new FetchService(
      orchestrator as unknown as FetchStrategyOrchestratorService,
      robots as unknown as RobotsPolicyService,
      jobs as unknown as FetchJobRepository,
      cache as unknown as PageCacheRepository,
      usage as unknown as ResearchUsageService,
    );
  });

  it('does not charge a domain-policy rejection', async () => {
    appConfigGet.mockReturnValue({
      RESEARCH_DOMAIN_ALLOWLIST: [],
      RESEARCH_DOMAIN_BLOCKLIST: ['blocked.example'],
      RESEARCH_HEADLESS_RENDER_ENABLED: true,
    });

    await expect(
      service.fetchPage('user-1', { url: 'https://blocked.example/a' }),
    ).rejects.toBeDefined();

    expect(orchestrator.fetchWithEscalation).not.toHaveBeenCalled();
    expect(usage.record).not.toHaveBeenCalled();
  });

  it('does not charge a robots.txt refusal', async () => {
    robots.evaluate.mockResolvedValue({
      outcome: RobotsOutcome.DISALLOWED,
      robotsUrl: 'https://example.com/robots.txt',
      crawlDelayMs: null,
    });

    await expect(
      service.fetchPage('user-1', { url: 'https://example.com/a' }),
    ).rejects.toBeDefined();

    expect(jobs.create).not.toHaveBeenCalled();
    expect(usage.record).not.toHaveBeenCalled();
  });

  it('does not charge a page-cache hit', async () => {
    cache.findByKey.mockResolvedValue({
      finalUrl: 'https://example.com/a',
      httpStatus: 200,
      mimeType: 'text/html',
      title: 'Cached',
      content: 'cached body',
      links: [],
      byteSize: 11,
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await service.fetchPage('user-1', { url: 'https://example.com/a' });

    expect(orchestrator.fetchWithEscalation).not.toHaveBeenCalled();
    expect(usage.record).not.toHaveBeenCalled();
  });

  it('charges a live fetch attempt even when every strategy fails', async () => {
    orchestrator.fetchWithEscalation.mockRejectedValue(new Error('network down'));

    await expect(
      service.fetchPage('user-1', { url: 'https://example.com/a' }),
    ).rejects.toBeDefined();

    expect(usage.record).toHaveBeenCalledWith('user-1', 'WEB_FETCH', 'fetch-job-1');
  });
});
