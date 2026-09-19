import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { NarrationKind } from '../../../../common/enums/narration-kind.enum';
import { PlannedResearchAction } from '../../../../common/enums/planned-research-action.enum';
import { ResearchWorkflow } from '../../../../common/enums/research-workflow.enum';
import { runResearch } from '../../../../common/utilities';
import { ResearchOrchestratorManager } from '../research-orchestrator.manager';

vi.mock('../../../../common/utilities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../common/utilities')>()),
  runResearch: vi.fn(),
}));

const mockedRunResearch = vi.mocked(runResearch);

const runWith = (workflow: string, urls: string[]): unknown => ({
  id: `run-${workflow}`,
  workflow,
  bundle: {
    items: urls.map((url) => ({ id: url, title: url, url, snippet: 'page text', confidence: 0.9 })),
    warnings: [],
    toolsUsed: [workflow],
    helperModels: [],
    providerSelection: { providerId: null },
  },
});

describe('ResearchOrchestratorManager', () => {
  let plan: ReturnType<typeof vi.fn>;
  let followUpAfterCrawl: ReturnType<typeof vi.fn>;
  let append: ReturnType<typeof vi.fn>;
  let manager: ResearchOrchestratorManager;
  const input = {
    userId: 'u1',
    userToken: 't',
    threadId: 'th1',
    intent: 'what does example.com sell',
  };

  const kinds = (): string[] => append.mock.calls.map((call) => (call[1] as { kind: string }).kind);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      RESEARCH_SERVICE_URL: 'http://research.test',
    } as unknown as ReturnType<typeof AppConfig.get>);
    plan = vi.fn();
    followUpAfterCrawl = vi.fn();
    append = vi.fn().mockResolvedValue(undefined);
    manager = new ResearchOrchestratorManager(
      { plan, followUpAfterCrawl } as never,
      { append } as never,
    );
  });

  it('answers directly without touching the web, narrating only the decision', async () => {
    plan.mockResolvedValue({
      action: PlannedResearchAction.ANSWER,
      urls: [],
      query: null,
      maxPages: 1,
      narration: 'No web needed.',
      thinking: '',
      decidedBy: 'm1',
    });

    await expect(manager.run(input)).resolves.toBeNull();
    expect(mockedRunResearch).not.toHaveBeenCalled();
    expect(kinds()).toEqual([NarrationKind.PLANNED]);
  });

  it('crawls the named site with the page budget the planner chose', async () => {
    plan.mockResolvedValue({
      action: PlannedResearchAction.CRAWL,
      urls: ['https://example.com/'],
      query: null,
      maxPages: 14,
      narration: 'Reading it.',
      thinking: '',
      decidedBy: 'm1',
    });
    mockedRunResearch.mockResolvedValue(runWith('SITE_CRAWL', ['https://example.com/']) as never);

    await manager.run(input);

    expect(mockedRunResearch).toHaveBeenCalledWith(
      'http://research.test',
      expect.objectContaining({
        workflow: ResearchWorkflow.SITE_CRAWL,
        maxPages: 14,
        correlationId: 'th1',
      }),
    );
    expect(kinds()).toEqual([
      NarrationKind.PLANNED,
      NarrationKind.CRAWL_STARTED,
      NarrationKind.CRAWL_DONE,
    ]);
  });

  // The whole point of the loop: after reading the site, go BACK to the AI,
  // and search only if the pages did not answer the question.
  it('crawls, goes back to the AI, then searches only because it asked to', async () => {
    plan.mockResolvedValue({
      action: PlannedResearchAction.CRAWL_THEN_SEARCH,
      urls: ['https://example.com/'],
      query: 'example competitors',
      maxPages: 8,
      narration: 'Site first.',
      thinking: 'They want the company explained, so the site comes first.',
      decidedBy: 'm1',
    });
    followUpAfterCrawl.mockResolvedValue({
      needsSearch: true,
      query: 'example vs rivals',
      narration: 'Checking rivals.',
      thinking: 'The pages cover the product but not its rivals.',
    });
    mockedRunResearch
      .mockResolvedValueOnce(runWith('SITE_CRAWL', ['https://example.com/']) as never)
      .mockResolvedValueOnce(runWith('SEARCH_THEN_FETCH', ['https://rival.com/']) as never);

    const result = (await manager.run(input)) as { bundle: { items: Array<{ url: string }> } };

    expect(mockedRunResearch).toHaveBeenLastCalledWith(
      'http://research.test',
      expect.objectContaining({
        workflow: ResearchWorkflow.SEARCH_THEN_FETCH,
        searchQuery: 'example vs rivals',
      }),
    );
    // Crawl evidence first: the page the user named outranks anything found.
    expect(result.bundle.items.map((item) => item.url)).toEqual([
      'https://example.com/',
      'https://rival.com/',
    ]);
    // The AI's own thinking is part of the stored log, not only the steps.
    expect(kinds()).toEqual([
      NarrationKind.AI_THOUGHT,
      NarrationKind.PLANNED,
      NarrationKind.CRAWL_STARTED,
      NarrationKind.CRAWL_DONE,
      NarrationKind.BACK_TO_AI,
      NarrationKind.AI_THOUGHT,
      NarrationKind.REPLANNED,
      NarrationKind.SEARCH_STARTED,
      NarrationKind.SEARCH_DONE,
    ]);
  });

  it('skips the search when the site already answered', async () => {
    plan.mockResolvedValue({
      action: PlannedResearchAction.CRAWL_THEN_SEARCH,
      urls: ['https://example.com/'],
      query: 'x',
      maxPages: 8,
      narration: '',
      thinking: '',
      decidedBy: 'm1',
    });
    followUpAfterCrawl.mockResolvedValue({
      needsSearch: false,
      query: null,
      narration: '',
      thinking: '',
    });
    mockedRunResearch.mockResolvedValue(runWith('SITE_CRAWL', ['https://example.com/']) as never);

    await manager.run(input);

    expect(mockedRunResearch).toHaveBeenCalledTimes(1);
  });

  // Rule 41: a failed web step is said out loud, never silent.
  it('narrates a failed step instead of going quiet', async () => {
    plan.mockResolvedValue({
      action: PlannedResearchAction.SEARCH,
      urls: [],
      query: 'q',
      maxPages: 1,
      narration: '',
      thinking: '',
      decidedBy: 'm1',
    });
    mockedRunResearch.mockResolvedValue(null);

    await expect(manager.run(input)).resolves.toBeNull();
    expect(kinds()).toContain(NarrationKind.RESEARCH_FAILED);
  });
});
