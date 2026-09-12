import { AppConfig } from '../../../../app/config/app.config';
import { FetchService } from '../fetch.service';
import type { HeadlessFetchAdapter } from '../../adapters/headless-fetch.adapter';
import type { HttpFetchAdapter } from '../../adapters/http-fetch.adapter';
import type { FetchJobRepository } from '../../repositories/fetch-job.repository';
import type { PageCacheRepository } from '../../repositories/page-cache.repository';
import type { ResearchUsageService } from '../../../../common/services/research-usage.service';
import type { FetchResult } from '../../types/fetch.types';

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: jest.fn() },
}));

function buildPlainResult(overrides: Partial<FetchResult> = {}): FetchResult {
  return {
    url: 'https://example.com/',
    finalUrl: 'https://example.com/',
    httpStatus: 200,
    mimeType: 'text/html',
    title: 'Example',
    content: '',
    links: [],
    byteSize: 100,
    cacheHit: false,
    latencyMs: 5,
    ...overrides,
  };
}

/**
 * `HeadlessFetchAdapter` itself is mocked out entirely — this suite proves
 * `FetchService`'s OWN decision (when to retry, and which result wins),
 * not the renderer's behavior, which `headless-fetch.adapter.spec.ts`
 * already covers.
 */
describe('FetchService headless fallback', () => {
  const appConfigGet = AppConfig.get as jest.Mock;
  let adapter: { fetchPage: jest.Mock };
  let headlessAdapter: { fetchPage: jest.Mock };
  let jobs: { create: jest.Mock; update: jest.Mock };
  let cache: { findByKey: jest.Mock; upsert: jest.Mock };
  let usage: { record: jest.Mock };
  let service: FetchService;

  beforeEach(() => {
    jest.clearAllMocks();
    appConfigGet.mockReturnValue({
      RESEARCH_DOMAIN_ALLOWLIST: [],
      RESEARCH_DOMAIN_BLOCKLIST: [],
      RESEARCH_HEADLESS_RENDER_ENABLED: true,
    });
    adapter = { fetchPage: jest.fn() };
    headlessAdapter = { fetchPage: jest.fn() };
    jobs = {
      create: jest.fn(async () => ({ id: 'fetch-job-1' })),
      update: jest.fn(async () => ({})),
    };
    cache = { findByKey: jest.fn(async () => null), upsert: jest.fn(async () => ({})) };
    usage = { record: jest.fn(async () => {}) };
    service = new FetchService(
      adapter as unknown as HttpFetchAdapter,
      headlessAdapter as unknown as HeadlessFetchAdapter,
      jobs as unknown as FetchJobRepository,
      cache as unknown as PageCacheRepository,
      usage as unknown as ResearchUsageService,
    );
  });

  it('retries with the headless adapter when the plain fetch content is thin', async () => {
    adapter.fetchPage.mockResolvedValue(buildPlainResult({ content: '' }));
    headlessAdapter.fetchPage.mockResolvedValue(
      buildPlainResult({
        content: 'A '.repeat(300),
        renderedWithHeadlessBrowser: true,
      }),
    );

    const result = await service.fetchPage('user-1', { url: 'https://example.com/' });

    expect(headlessAdapter.fetchPage).toHaveBeenCalledTimes(1);
    expect(result.renderedWithHeadlessBrowser).toBe(true);
  });

  it('does not retry when the plain fetch already has real content', async () => {
    adapter.fetchPage.mockResolvedValue(buildPlainResult({ content: 'A '.repeat(300) }));

    const result = await service.fetchPage('user-1', { url: 'https://example.com/' });

    expect(headlessAdapter.fetchPage).not.toHaveBeenCalled();
    expect(result.renderedWithHeadlessBrowser).toBeUndefined();
  });

  it('does not retry a non-HTML thin result', async () => {
    adapter.fetchPage.mockResolvedValue(
      buildPlainResult({ mimeType: 'application/json', content: '{}' }),
    );

    await service.fetchPage('user-1', { url: 'https://example.com/data.json' });

    expect(headlessAdapter.fetchPage).not.toHaveBeenCalled();
  });

  it('never retries when the feature flag is off', async () => {
    appConfigGet.mockReturnValue({
      RESEARCH_DOMAIN_ALLOWLIST: [],
      RESEARCH_DOMAIN_BLOCKLIST: [],
      RESEARCH_HEADLESS_RENDER_ENABLED: false,
    });
    adapter.fetchPage.mockResolvedValue(buildPlainResult({ content: '' }));

    const result = await service.fetchPage('user-1', { url: 'https://example.com/' });

    expect(headlessAdapter.fetchPage).not.toHaveBeenCalled();
    expect(result.content).toBe('');
  });

  it('keeps the plain result when a headless render fails, rather than failing the fetch', async () => {
    adapter.fetchPage.mockResolvedValue(buildPlainResult({ content: '' }));
    headlessAdapter.fetchPage.mockRejectedValue(new Error('browser crashed'));

    const result = await service.fetchPage('user-1', { url: 'https://example.com/' });

    expect(result.content).toBe('');
    expect(result.renderedWithHeadlessBrowser).toBeUndefined();
  });

  it('keeps the plain result when the headless render came back thinner still', async () => {
    adapter.fetchPage.mockResolvedValue(buildPlainResult({ content: 'thin but real content' }));
    headlessAdapter.fetchPage.mockResolvedValue(
      buildPlainResult({ content: '', renderedWithHeadlessBrowser: true }),
    );

    const result = await service.fetchPage('user-1', { url: 'https://example.com/' });

    expect(result.content).toBe('thin but real content');
    expect(result.renderedWithHeadlessBrowser).toBeUndefined();
  });
});
