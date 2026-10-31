import { HttpStatus } from '@nestjs/common';
import { type Mock, vi } from 'vitest';
import { ResearchErrorCode } from '../../../../common/enums/research-error-code.enum';
import { BusinessException } from '../../../../common/errors/business.exception';
import { ProviderSelectionMode } from '../../../../common/enums/provider-selection-mode.enum';
import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { FetchRenderHint } from '../../../fetch/enums/fetch-render-hint.enum';
import { ResearchManager } from '../research.manager';
import type { SiteAuditManager } from '../site-audit.manager';
import type { SiteCrawlManager } from '../site-crawl.manager';
import type { FetchService } from '../../../fetch/services/fetch.service';
import type { SearchExecutionService } from '../../../search/services/search-execution.service';
import type { ScrapeService } from '../../../scrape/services/scrape.service';
import type { ResearchRunRepository } from '../../repositories/research-run.repository';
import type { ResearchUsageService } from '../../../../common/services/research-usage.service';

// A URL is "mentioned" only when it appears as a whole token — bounded by
// whitespace, quotes or the end of the string. Plain `includes` treats
// https://host.example.com as a match for https://host.example.com.evil.test.
function mentionsUrl(text: string, url: string): boolean {
  return text.split(/[\s"'<>()]+/u).includes(url);
}

describe('ResearchManager', () => {
  let runs: {
    create: Mock;
    update: Mock;
    findById: Mock;
    listByUser: Mock;
  };
  let search: {
    execute: Mock;
  };
  let fetchService: {
    fetchPage: Mock;
  };
  let scrapeService: {
    extract: Mock;
  };
  let manager: ResearchManager;
  let researchUsage: { record: Mock };
  let siteCrawlManager: { crawl: Mock };
  let siteAuditManager: { analyze: Mock };

  beforeEach(() => {
    runs = {
      create: vi.fn(async () => ({ id: 'run-1' })),
      update: vi.fn(async (id, data) => ({ id, ...(data as object) })),
      findById: vi.fn(),
      listByUser: vi.fn(),
    };
    search = {
      execute: vi.fn(async () => ({
        providerId: 'provider-1',
        providerName: 'Ollama Web Search',
        providerKind: SearchProviderKind.OLLAMA_WEB,
        selectionMode: ProviderSelectionMode.AUTO,
        fallbackUsed: false,
        attemptedProviders: ['Ollama Web Search'],
        results: [
          {
            id: 's1',
            title: 'Result',
            url: 'https://example.com/1',
            snippet: 'Snippet',
            publishedAt: null,
            freshness: null,
            score: 0.9,
            providerKind: SearchProviderKind.OLLAMA_WEB,
            raw: {},
          },
        ],
      })),
    };
    fetchService = {
      fetchPage: vi.fn(async () => ({
        url: 'https://example.com/1',
        finalUrl: 'https://example.com/1',
        httpStatus: 200,
        mimeType: 'text/html',
        title: 'Fetched',
        content: '<p>cached body</p>',
        links: [],
        byteSize: 120,
        cacheHit: true,
        latencyMs: 4,
      })),
    };
    scrapeService = {
      extract: vi.fn(() => ({
        profile: 'ARTICLE',
        title: 'Extracted',
        text: 'Extracted text',
        structured: { headings: [] },
        warnings: [],
      })),
    };
    researchUsage = { record: vi.fn(async () => {}) };
    siteCrawlManager = { crawl: vi.fn(async () => []) };
    siteAuditManager = { analyze: vi.fn(() => []) };

    manager = new ResearchManager(
      runs as unknown as ResearchRunRepository,
      search as unknown as SearchExecutionService,
      fetchService as unknown as FetchService,
      scrapeService as unknown as ScrapeService,
      researchUsage as unknown as ResearchUsageService,
      siteCrawlManager as unknown as SiteCrawlManager,
      siteAuditManager as unknown as SiteAuditManager,
    );
  });

  it('SEARCH_FETCH_EXTRACT adds web_extract tool and extract trace summary', async () => {
    await manager.run('u1', {
      intent: 'latest AI news',
      workflow: ResearchWorkflowKind.SEARCH_FETCH_EXTRACT,
    });

    expect(scrapeService.extract).toHaveBeenCalledTimes(1);
    expect(researchUsage.record).toHaveBeenCalledWith(
      'u1',
      'WEB_EXTRACT',
      expect.stringMatching(/^run-1:extract:/),
    );
    const updatePayload = runs.update.mock.calls.at(-1)?.[1] as {
      bundle?: { toolsUsed?: string[]; providerSelection?: { providerKind?: string | null } };
      trace?: Array<{ phase?: string }>;
    };
    expect(updatePayload.bundle?.toolsUsed).toEqual(
      expect.arrayContaining(['web_search', 'web_fetch', 'web_extract', 'search:ollama_web']),
    );
    expect(updatePayload.bundle?.providerSelection?.providerKind).toBe(
      SearchProviderKind.OLLAMA_WEB,
    );
    const phases = (updatePayload.trace ?? []).map((entry) => entry.phase ?? '');
    expect(phases).toEqual(expect.arrayContaining(['search', 'fetch', 'extract']));
  });

  it('SEARCH_THEN_FETCH skips scrape extraction stage', async () => {
    await manager.run('u1', {
      intent: 'cloud reliability checklist',
      workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
    });

    expect(scrapeService.extract).not.toHaveBeenCalled();
    const updatePayload = runs.update.mock.calls.at(-1)?.[1] as {
      bundle?: { toolsUsed?: string[] };
    };
    expect(updatePayload.bundle?.toolsUsed).toEqual(
      expect.arrayContaining(['web_search', 'web_fetch']),
    );
    expect(updatePayload.bundle?.toolsUsed).not.toContain('web_extract');
  });

  it('SEARCH_FETCH_EXTRACT records extract skipped when fetch has no items', async () => {
    fetchService.fetchPage.mockRejectedValueOnce(new Error('fetch down'));

    await manager.run('u1', {
      intent: 'browser feature test',
      workflow: ResearchWorkflowKind.SEARCH_FETCH_EXTRACT,
    });

    const updatePayload = runs.update.mock.calls.at(-1)?.[1] as {
      trace?: Array<{ phase?: string; status?: string }>;
    };
    const extractTrace = (updatePayload.trace ?? []).find((entry) => entry.phase === 'extract');
    expect(extractTrace?.status).toBe('skipped');
    expect(researchUsage.record).not.toHaveBeenCalled();
  });

  it('meters an attempted non-empty extraction even when scraping fails', async () => {
    scrapeService.extract.mockImplementationOnce(() => {
      throw new Error('parser failed');
    });

    await manager.run('u1', {
      intent: 'parser failure case',
      workflow: ResearchWorkflowKind.SEARCH_FETCH_EXTRACT,
    });

    expect(researchUsage.record).toHaveBeenCalledWith(
      'u1',
      'WEB_EXTRACT',
      expect.stringMatching(/^run-1:extract:/),
    );
  });

  describe('a URL the user wrote', () => {
    // The finding this exists for: there was no code path anywhere that took a
    // URL out of a prompt and fetched it. `summarize https://example.com/post`
    // became a keyword search that happened to contain a URL, and the page was
    // opened only if the search engine returned it.
    function lastBundle(): {
      items?: Array<{ url?: string; source?: string; confidence?: number }>;
      toolsUsed?: string[];
      warnings?: string[];
    } {
      const payload = runs.update.mock.calls.at(-1)?.[1] as { bundle?: never };
      return (payload.bundle ?? {}) as never;
    }

    it('is fetched directly, not searched for', async () => {
      await manager.run('u1', {
        intent: 'summarize https://user-supplied.example.com/post',
        workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
      });

      expect(fetchService.fetchPage).toHaveBeenCalledWith('u1', {
        url: 'https://user-supplied.example.com/post',
      });
      expect(lastBundle().toolsUsed).toEqual(expect.arrayContaining(['web_fetch:user_url']));
    });

    it('outranks anything the search engine found', async () => {
      // The bundle sorts by confidence and then caps the list, so a pasted link
      // scoring like a search hit could be trimmed out of the very bundle it
      // was the point of.
      fetchService.fetchPage.mockImplementation(async (_userId: string, dto: { url: string }) => ({
        url: dto.url,
        finalUrl: dto.url,
        httpStatus: 200,
        mimeType: 'text/html',
        title: 'User page',
        content: 'body',
        links: [],
        byteSize: 10,
        cacheHit: false,
        latencyMs: 1,
      }));

      await manager.run('u1', {
        intent: 'read https://user-supplied.example.com/post',
        workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
      });

      const items = lastBundle().items ?? [];
      expect(items[0]?.url).toBe('https://user-supplied.example.com/post');
      expect(items[0]?.confidence).toBe(1);
    });

    it('is never fetched twice when search also returns it', async () => {
      search.execute.mockImplementation(async () => ({
        providerId: 'provider-1',
        providerName: 'Ollama Web Search',
        providerKind: SearchProviderKind.OLLAMA_WEB,
        selectionMode: ProviderSelectionMode.AUTO,
        fallbackUsed: false,
        attemptedProviders: ['Ollama Web Search'],
        results: [
          {
            id: 's1',
            title: 'Same page',
            url: 'https://dup.example.com/x',
            snippet: 'Snippet',
            publishedAt: null,
            freshness: null,
            score: 0.9,
            providerKind: SearchProviderKind.OLLAMA_WEB,
            raw: {},
          },
        ],
      }));
      fetchService.fetchPage.mockImplementation(async (_userId: string, dto: { url: string }) => ({
        url: dto.url,
        finalUrl: dto.url,
        httpStatus: 200,
        mimeType: 'text/html',
        title: 'Same page',
        content: 'body',
        links: [],
        byteSize: 10,
        cacheHit: false,
        latencyMs: 1,
      }));

      await manager.run('u1', {
        intent: 'read https://dup.example.com/x',
        workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
      });

      expect(fetchService.fetchPage).toHaveBeenCalledTimes(1);
    });

    it('warns by name when the page cannot be opened, rather than failing silently', async () => {
      // A run that failed cleanly produced zero items AND zero warnings, and
      // downstream the model is only told browsing happened when one of those
      // is non-empty. So the moment fetching broke was exactly the moment the
      // model was told nothing and answered "I can't browse the web".
      fetchService.fetchPage.mockRejectedValue(new Error('403 Forbidden'));

      await manager.run('u1', {
        intent: 'read https://blocked.example.com/post',
        workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
      });

      const warnings = lastBundle().warnings ?? [];
      // Matched on a URL BOUNDARY, not a bare substring: `includes` on a URL
      // also matches https://blocked.example.com.evil.test, which is how a
      // sanitizer check quietly passes for a host it should reject.
      expect(
        warnings.some((warning) => mentionsUrl(warning, 'https://blocked.example.com/post')),
      ).toBe(true);
    });

    it('does not open pages in a search-only run, and says so', async () => {
      // SEARCH_ONLY was chosen and priced as a run that does not open pages.
      // Quietly opening one changes what the user paid for; saying nothing is
      // the failure this whole workstream exists to remove.
      await manager.run('u1', {
        intent: 'summarize https://user-supplied.example.com/post',
        workflow: ResearchWorkflowKind.SEARCH_ONLY,
      });

      expect(fetchService.fetchPage).not.toHaveBeenCalled();
      const warnings = lastBundle().warnings ?? [];
      expect(
        warnings.some(
          (warning) =>
            mentionsUrl(warning, 'https://user-supplied.example.com/post') &&
            warning.includes('NOT opened'),
        ),
      ).toBe(true);
    });

    it('leaves a link-free prompt exactly as it was', async () => {
      await manager.run('u1', {
        intent: 'latest AI news',
        workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
      });

      expect(lastBundle().toolsUsed).not.toEqual(expect.arrayContaining(['web_fetch:user_url']));
    });
  });

  describe('SITE_CRAWL workflow', () => {
    function lastBundle(): {
      items?: Array<{ url?: string; id?: string }>;
      warnings?: string[];
      auditFindings?: unknown[];
    } {
      const payload = runs.update.mock.calls.at(-1)?.[1] as { bundle?: never };
      return (payload.bundle ?? {}) as never;
    }

    it('delegates to SiteCrawlManager with the URL found in the intent, and never runs a search', async () => {
      siteCrawlManager.crawl.mockResolvedValue([
        {
          id: 'c1',
          title: 'Home',
          url: 'https://example.com/',
          snippet: 'content',
          source: 'fetch',
          providerKind: null,
          publishedAt: null,
          fetchedAt: null,
          confidence: 0.95,
        },
      ]);

      await manager.run('u1', {
        intent: 'crawl https://example.com/ and audit it',
        workflow: ResearchWorkflowKind.SITE_CRAWL,
      });

      expect(siteCrawlManager.crawl).toHaveBeenCalledWith(
        'u1',
        'https://example.com/',
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
        undefined,
        undefined,
        expect.any(String),
        undefined,
        undefined,
      );
      expect(search.execute).not.toHaveBeenCalled();
      expect(lastBundle().items).toEqual([
        expect.objectContaining({ url: 'https://example.com/' }),
      ]);
    });

    it('forwards the caller-supplied correlationId to SiteCrawlManager', async () => {
      siteCrawlManager.crawl.mockResolvedValue([]);

      await manager.run('u1', {
        intent: 'crawl https://example.com/',
        workflow: ResearchWorkflowKind.SITE_CRAWL,
        correlationId: 'thread-42',
      });

      expect(siteCrawlManager.crawl).toHaveBeenCalledWith(
        'u1',
        'https://example.com/',
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
        'thread-42',
        undefined,
        expect.any(String),
        undefined,
        undefined,
      );
    });

    it('forwards the planner render hint to the crawl (tier ordering only)', async () => {
      siteCrawlManager.crawl.mockResolvedValue([]);

      await manager.run('u1', {
        intent: 'crawl https://example.com/',
        workflow: ResearchWorkflowKind.SITE_CRAWL,
        render: FetchRenderHint.JS,
      });

      expect(siteCrawlManager.crawl).toHaveBeenCalledWith(
        'u1',
        'https://example.com/',
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
        undefined,
        undefined,
        expect.any(String),
        undefined,
        FetchRenderHint.JS,
      );
    });

    it('warns instead of crawling when the intent has no URL at all', async () => {
      await manager.run('u1', {
        intent: 'crawl my website please',
        workflow: ResearchWorkflowKind.SITE_CRAWL,
      });

      expect(siteCrawlManager.crawl).not.toHaveBeenCalled();
      expect(lastBundle().warnings?.some((w) => w.includes('no URL to crawl'))).toBe(true);
    });

    it('attaches SiteAuditManager findings computed from the FINAL bundle items', async () => {
      const crawledItem = {
        id: 'c1',
        title: 'Home',
        url: 'https://example.com/',
        snippet: 'content',
        source: 'fetch' as const,
        providerKind: null,
        publishedAt: null,
        fetchedAt: null,
        confidence: 0.95,
      };
      siteCrawlManager.crawl.mockResolvedValue([crawledItem]);
      siteAuditManager.analyze.mockReturnValue([
        {
          category: 'meta-description',
          claim: '1 of 1 crawled page(s) have no description.',
          confidence: 'HIGH',
          evidenceItemIds: ['c1'],
          limitations: [],
        },
      ]);

      await manager.run('u1', {
        intent: 'crawl https://example.com/',
        workflow: ResearchWorkflowKind.SITE_CRAWL,
      });

      // Called with the bundle's OWN items array (post-dedup/truncation),
      // not the raw pre-bundle array, so a finding can never cite an id
      // that was trimmed out of the bundle it lives in.
      expect(siteAuditManager.analyze).toHaveBeenCalledWith(lastBundle().items);
      expect(lastBundle().auditFindings).toHaveLength(1);
    });

    it('omits auditFindings entirely when SiteAuditManager finds nothing', async () => {
      siteCrawlManager.crawl.mockResolvedValue([]);
      siteAuditManager.analyze.mockReturnValue([]);

      await manager.run('u1', {
        intent: 'crawl https://example.com/',
        workflow: ResearchWorkflowKind.SITE_CRAWL,
      });

      expect(lastBundle().auditFindings).toBeUndefined();
    });
  });

  describe('parallel fetch batches (ADR-211)', () => {
    const hits = (n: number): unknown[] =>
      Array.from({ length: n }, (_, i) => ({
        id: `s${String(i)}`,
        title: `Result ${String(i)}`,
        url: `https://site${String(i)}.example.com/page`,
        snippet: 'Snippet',
        publishedAt: null,
        freshness: null,
        score: 0.9 - i * 0.01,
        providerKind: SearchProviderKind.OLLAMA_WEB,
        raw: {},
      }));

    const page = (url: string): object => ({
      url,
      finalUrl: url,
      httpStatus: 200,
      mimeType: 'text/html',
      title: 'T',
      content: `body of ${url}`,
      links: [],
      byteSize: 10,
      cacheHit: false,
      latencyMs: 1,
    });

    const sleep = (ms: number): Promise<void> =>
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      });

    function searchReturns(count: number): void {
      search.execute.mockImplementation(async () => ({
        providerId: 'p',
        providerName: 'P',
        providerKind: SearchProviderKind.OLLAMA_WEB,
        selectionMode: ProviderSelectionMode.AUTO,
        fallbackUsed: false,
        attemptedProviders: ['P'],
        results: hits(count),
      }));
    }

    function lastBundle(): {
      items: Array<{ url: string; source?: string; fetchStatus?: string }>;
      warnings: string[];
      fetchReport?: Array<{ url: string; status: string; origin: string }>;
      fetchSummary?: { attempted: number; ok: number; wallMs: number; sumMs: number };
    } {
      const payload = runs.update.mock.calls.at(-1)?.[1] as { bundle?: never };
      return (payload.bundle ?? {}) as never;
    }

    it('fetches the top 8 search hits at once (more than 1 in flight), not one by one', async () => {
      searchReturns(12);
      let inFlight = 0;
      let max = 0;
      fetchService.fetchPage.mockImplementation(async (_u: string, dto: { url: string }) => {
        inFlight += 1;
        max = Math.max(max, inFlight);
        await sleep(20);
        inFlight -= 1;
        return page(dto.url);
      });

      await manager.run('u1', {
        intent: 'many hits',
        workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
      });

      expect(fetchService.fetchPage).toHaveBeenCalledTimes(8);
      expect(max).toBeGreaterThan(1);
      expect(max).toBeLessThanOrEqual(6);
      const bundle = lastBundle();
      expect(bundle.fetchReport).toHaveLength(8);
      expect(bundle.fetchSummary?.ok).toBe(8);
      expect(bundle.fetchSummary?.sumMs ?? 0).toBeGreaterThan(bundle.fetchSummary?.wallMs ?? 0);
    });

    it('serialises two hits of the same host', async () => {
      search.execute.mockImplementation(async () => ({
        providerId: 'p',
        providerName: 'P',
        providerKind: SearchProviderKind.OLLAMA_WEB,
        selectionMode: ProviderSelectionMode.AUTO,
        fallbackUsed: false,
        attemptedProviders: ['P'],
        results: [
          ...hits(1),
          { ...(hits(1)[0] as object), id: 'x', url: 'https://site0.example.com/other' },
        ],
      }));
      const running = new Map<string, number>();
      let overlap = false;
      fetchService.fetchPage.mockImplementation(async (_u: string, dto: { url: string }) => {
        const host = new URL(dto.url).hostname;
        running.set(host, (running.get(host) ?? 0) + 1);
        overlap = overlap || (running.get(host) ?? 0) > 1;
        await sleep(15);
        running.set(host, (running.get(host) ?? 0) - 1);
        return page(dto.url);
      });

      await manager.run('u1', {
        intent: 'same host',
        workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
      });

      expect(fetchService.fetchPage).toHaveBeenCalledTimes(2);
      expect(overlap).toBe(false);
    });

    it('overlaps the pasted-URL fetch with the search call', async () => {
      const events: string[] = [];
      search.execute.mockImplementation(async () => {
        events.push('search:start');
        await sleep(30);
        events.push('search:end');
        return {
          providerId: 'p',
          providerName: 'P',
          providerKind: SearchProviderKind.OLLAMA_WEB,
          selectionMode: ProviderSelectionMode.AUTO,
          fallbackUsed: false,
          attemptedProviders: ['P'],
          results: [],
        };
      });
      fetchService.fetchPage.mockImplementation(async (_u: string, dto: { url: string }) => {
        events.push('fetch:start');
        await sleep(10);
        return page(dto.url);
      });

      await manager.run('u1', {
        intent: 'read https://user.example.com/post',
        workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
      });

      expect(events.indexOf('fetch:start')).toBeLessThan(events.indexOf('search:end'));
    });

    it('reports a hung page as TIMEOUT at the cap but keeps the finished ones', async () => {
      vi.useFakeTimers();
      try {
        searchReturns(3);
        fetchService.fetchPage.mockImplementation(async (_u: string, dto: { url: string }) => {
          if (dto.url.includes('site1')) {
            await new Promise(() => {});
          }
          return page(dto.url);
        });

        const running = manager.run('u1', {
          intent: 'one hangs',
          workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
        });
        await vi.advanceTimersByTimeAsync(31_000);
        await running;

        const bundle = lastBundle();
        const status = Object.fromEntries(
          (bundle.fetchReport ?? []).map((row) => [new URL(row.url).hostname, row.status]),
        );
        expect(status['site0.example.com']).toBe('OK');
        expect(status['site1.example.com']).toBe('TIMEOUT');
        expect(status['site2.example.com']).toBe('OK');
        expect(bundle.items.find((i) => i.url.includes('site1'))?.fetchStatus).toBe('TIMEOUT');
      } finally {
        vi.useRealTimers();
      }
    });

    it('keeps results in search-rank order whatever order pages finish in', async () => {
      searchReturns(3);
      const delays: Record<string, number> = { site0: 40, site1: 5, site2: 20 };
      fetchService.fetchPage.mockImplementation(async (_u: string, dto: { url: string }) => {
        await sleep(delays[new URL(dto.url).hostname.split('.')[0] ?? ''] ?? 0);
        return page(dto.url);
      });

      await manager.run('u1', {
        intent: 'order',
        workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
      });

      expect((lastBundle().fetchReport ?? []).map((r) => new URL(r.url).hostname)).toEqual([
        'site0.example.com',
        'site1.example.com',
        'site2.example.com',
      ]);
    });

    it('one failing URL becomes a warning and a FAILED row, the rest still land', async () => {
      searchReturns(3);
      fetchService.fetchPage.mockImplementation(async (_u: string, dto: { url: string }) => {
        if (dto.url.includes('site1')) throw new Error('connection reset');
        return page(dto.url);
      });

      await manager.run('u1', {
        intent: 'one fails',
        workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
      });

      const bundle = lastBundle();
      expect(bundle.warnings.join(' ')).toContain('connection reset');
      expect((bundle.fetchReport ?? []).map((r) => r.status)).toEqual(['OK', 'FAILED', 'OK']);
    });

    it('keeps refusing SSRF targets and robots disallows inside a batch', async () => {
      search.execute.mockImplementation(async () => ({
        providerId: 'p',
        providerName: 'P',
        providerKind: SearchProviderKind.OLLAMA_WEB,
        selectionMode: ProviderSelectionMode.AUTO,
        fallbackUsed: false,
        attemptedProviders: ['P'],
        results: [
          ...hits(1),
          { ...(hits(1)[0] as object), id: 'm', url: 'http://169.254.169.254/latest/meta-data' },
          { ...(hits(1)[0] as object), id: 'n', url: 'http://10.0.0.5/admin' },
          { ...(hits(1)[0] as object), id: 'r', url: 'https://robots.example.com/no' },
        ],
      }));
      fetchService.fetchPage.mockImplementation(async (_u: string, dto: { url: string }) => {
        if (dto.url.includes('169.254') || dto.url.includes('10.0.0.5')) {
          throw new BusinessException('k', ResearchErrorCode.UNSAFE_URL, HttpStatus.BAD_REQUEST, {
            message: 'private address',
          });
        }
        if (dto.url.includes('robots.example')) {
          throw new BusinessException(
            'k',
            ResearchErrorCode.FETCH_ROBOTS_DISALLOWED,
            HttpStatus.FORBIDDEN,
          );
        }
        return page(dto.url);
      });

      await manager.run('u1', { intent: 'ssrf', workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH });

      const status = Object.fromEntries(
        (lastBundle().fetchReport ?? []).map((row) => [new URL(row.url).hostname, row.status]),
      );
      expect(status['169.254.169.254']).toBe('BLOCKED_SSRF');
      expect(status['10.0.0.5']).toBe('BLOCKED_SSRF');
      expect(status['robots.example.com']).toBe('BLOCKED_ROBOTS');
      expect(status['site0.example.com']).toBe('OK');
    });

    it('drops a page whose canonical URL or body repeats an earlier page', async () => {
      search.execute.mockImplementation(async () => ({
        providerId: 'p',
        providerName: 'P',
        providerKind: SearchProviderKind.OLLAMA_WEB,
        selectionMode: ProviderSelectionMode.AUTO,
        fallbackUsed: false,
        attemptedProviders: ['P'],
        results: [
          ...hits(1),
          { ...(hits(1)[0] as object), id: 'mirror', url: 'https://mirror.example.com/copy' },
        ],
      }));
      fetchService.fetchPage.mockImplementation(async (_u: string, dto: { url: string }) => ({
        ...page(dto.url),
        content: 'identical body',
      }));

      await manager.run('u1', { intent: 'dup', workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH });

      const fetched = lastBundle().items.filter((i) => i.source === 'fetch');
      expect(fetched).toHaveLength(1);
    });

    it('crawls several sites in parallel and merges them in URL order', async () => {
      let inFlight = 0;
      let max = 0;
      siteCrawlManager.crawl.mockImplementation(async (_u: string, url: string) => {
        inFlight += 1;
        max = Math.max(max, inFlight);
        await sleep(url.includes('one') ? 30 : 5);
        inFlight -= 1;
        return [
          {
            id: url,
            title: null,
            url,
            snippet: 's',
            source: 'fetch',
            providerKind: null,
            publishedAt: null,
            fetchedAt: null,
            confidence: 0.7,
          },
        ];
      });

      await manager.run('u1', {
        intent: 'crawl https://one.example.com https://two.example.com https://three.example.com',
        workflow: ResearchWorkflowKind.SITE_CRAWL,
      });

      expect(max).toBeGreaterThan(1);
      expect(siteCrawlManager.crawl).toHaveBeenCalledTimes(3);
      expect(lastBundle().items).toHaveLength(3);
    });
  });
});
