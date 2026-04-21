import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { ResearchManager } from '../research.manager';
import type { FetchService } from '../../../fetch/services/fetch.service';
import type { SearchExecutionService } from '../../../search/services/search-execution.service';
import type { ScrapeService } from '../../../scrape/services/scrape.service';
import type { ResearchRunRepository } from '../../repositories/research-run.repository';

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

  beforeEach(() => {
    runs = {
      create: jest.fn(async () => ({ id: 'run-1' })),
      update: jest.fn(async (id, data) => ({ id, ...(data as object) })),
      findById: jest.fn(),
      listByUser: jest.fn(),
    };
    search = {
      execute: jest.fn(async () => ({
        providerName: 'Ollama Web Search',
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

    manager = new ResearchManager(
      runs as unknown as ResearchRunRepository,
      search as unknown as SearchExecutionService,
      fetchService as unknown as FetchService,
      scrapeService as unknown as ScrapeService,
    );
  });

  it('SEARCH_FETCH_EXTRACT adds web_extract tool and extract trace summary', async () => {
    await manager.run('u1', {
      intent: 'latest AI news',
      workflow: ResearchWorkflowKind.SEARCH_FETCH_EXTRACT,
    });

    expect(scrapeService.extract).toHaveBeenCalledTimes(1);
    const updatePayload = runs.update.mock.calls.at(-1)?.[1] as {
      bundle?: { toolsUsed?: string[] };
      trace?: Array<{ phase?: string }>;
    };
    expect(updatePayload.bundle?.toolsUsed).toEqual(
      expect.arrayContaining(['web_search', 'web_fetch', 'web_extract']),
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
  });
});
