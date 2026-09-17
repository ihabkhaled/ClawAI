import { vi, type Mock } from 'vitest';
import { AppConfig } from '../../../../app/config/app.config';
import { FetchService } from '../fetch.service';
import type { HeadlessFetchAdapter } from '../../adapters/headless-fetch.adapter';
import type { HttpFetchAdapter } from '../../adapters/http-fetch.adapter';
import type { FetchJobRepository } from '../../repositories/fetch-job.repository';
import type { PageCacheRepository } from '../../repositories/page-cache.repository';
import type { ResearchUsageService } from '../../../../common/services/research-usage.service';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn() },
}));

describe('FetchService usage accounting', () => {
  const appConfigGet = AppConfig.get as Mock;
  let adapter: { fetchPage: Mock };
  let headlessAdapter: { fetchPage: Mock };
  let jobs: { create: Mock; update: Mock };
  let cache: { findByKey: Mock; upsert: Mock };
  let usage: { record: Mock };
  let service: FetchService;

  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue({
      RESEARCH_DOMAIN_ALLOWLIST: [],
      RESEARCH_DOMAIN_BLOCKLIST: [],
      RESEARCH_HEADLESS_RENDER_ENABLED: false,
    });
    adapter = { fetchPage: vi.fn() };
    headlessAdapter = { fetchPage: vi.fn() };
    jobs = {
      create: vi.fn(async () => ({ id: 'fetch-job-1' })),
      update: vi.fn(async () => ({})),
    };
    cache = { findByKey: vi.fn(async () => null), upsert: vi.fn(async () => ({})) };
    usage = { record: vi.fn(async () => {}) };
    service = new FetchService(
      adapter as unknown as HttpFetchAdapter,
      headlessAdapter as unknown as HeadlessFetchAdapter,
      jobs as unknown as FetchJobRepository,
      cache as unknown as PageCacheRepository,
      usage as unknown as ResearchUsageService,
    );
  });

  it('does not charge a domain-policy rejection', async () => {
    appConfigGet.mockReturnValue({
      RESEARCH_DOMAIN_ALLOWLIST: [],
      RESEARCH_DOMAIN_BLOCKLIST: ['blocked.example'],
    });

    await expect(
      service.fetchPage('user-1', { url: 'https://blocked.example/a' }),
    ).rejects.toBeDefined();

    expect(adapter.fetchPage).not.toHaveBeenCalled();
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

    expect(adapter.fetchPage).not.toHaveBeenCalled();
    expect(usage.record).not.toHaveBeenCalled();
  });

  it('charges a live fetch attempt even when the network request fails', async () => {
    adapter.fetchPage.mockRejectedValue(new Error('network down'));

    await expect(
      service.fetchPage('user-1', { url: 'https://example.com/a' }),
    ).rejects.toBeDefined();

    expect(usage.record).toHaveBeenCalledWith('user-1', 'WEB_FETCH', 'fetch-job-1');
  });
});
