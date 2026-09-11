import { ProviderSelectionMode } from '../../../../common/enums/provider-selection-mode.enum';
import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { ResearchManager } from '../research.manager';
import type { SiteCrawlManager } from '../site-crawl.manager';
import type { FetchService } from '../../../fetch/services/fetch.service';
import type { SearchExecutionService } from '../../../search/services/search-execution.service';
import type { ScrapeService } from '../../../scrape/services/scrape.service';
import type { ResearchRunRepository } from '../../repositories/research-run.repository';
import type { ResearchUsageService } from '../../../../common/services/research-usage.service';

describe('ResearchManager', () => {
  let runs: {
    create: jest.Mock;
    update: jest.Mock;
    findById: jest.Mock;
    listByUser: jest.Mock;
  };
  let search: {
    execute: jest.Mock;
  };
  let fetchService: {
    fetchPage: jest.Mock;
  };
  let scrapeService: {
    extract: jest.Mock;
  };
  let manager: ResearchManager;
  let researchUsage: { record: jest.Mock };
  let siteCrawlManager: { crawl: jest.Mock };

  beforeEach(() => {
    runs = {
      create: jest.fn(async () => ({ id: 'run-1' })),
      update: jest.fn(async (id, data) => ({ id, ...(data as object) })),
      findById: jest.fn(),
      listByUser: jest.fn(),
    };
    search = {
      execute: jest.fn(async () => ({
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
      fetchPage: jest.fn(async () => ({
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
      extract: jest.fn(() => ({
        profile: 'ARTICLE',
        title: 'Extracted',
        text: 'Extracted text',
        structured: { headings: [] },
        warnings: [],
      })),
    };
    researchUsage = { record: jest.fn(async () => {}) };
    siteCrawlManager = { crawl: jest.fn(async () => []) };

    manager = new ResearchManager(
      runs as unknown as ResearchRunRepository,
      search as unknown as SearchExecutionService,
      fetchService as unknown as FetchService,
      scrapeService as unknown as ScrapeService,
      researchUsage as unknown as ResearchUsageService,
      siteCrawlManager as unknown as SiteCrawlManager,
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
      expect(warnings.some((warning) => warning.includes('https://blocked.example.com/post'))).toBe(
        true,
      );
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
            warning.includes('https://user-supplied.example.com/post') &&
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
    function lastBundle(): { items?: Array<{ url?: string }>; warnings?: string[] } {
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
      );
      expect(search.execute).not.toHaveBeenCalled();
      expect(lastBundle().items).toEqual([
        expect.objectContaining({ url: 'https://example.com/' }),
      ]);
    });

    it('warns instead of crawling when the intent has no URL at all', async () => {
      await manager.run('u1', {
        intent: 'crawl my website please',
        workflow: ResearchWorkflowKind.SITE_CRAWL,
      });

      expect(siteCrawlManager.crawl).not.toHaveBeenCalled();
      expect(lastBundle().warnings?.some((w) => w.includes('no URL to crawl'))).toBe(true);
    });
  });
});
