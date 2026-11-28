import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { STREAM_RUN_REPLACED_MESSAGE } from '../../constants/stream-cancellation.constants';

import { AppConfig } from '../../../../app/config/app.config';
import { NarrationKind } from '../../../../common/enums/narration-kind.enum';
import { ResearchPlatformCategory } from '../../../../common/enums/research-platform-category.enum';
import { PlannedResearchAction } from '../../../../common/enums/planned-research-action.enum';
import { ResearchWorkflow } from '../../../../common/enums/research-workflow.enum';
import { runResearch } from '../../../../common/utilities';
import type * as CommonUtilities from '../../../../common/utilities';
import type { ResearchGapCheck, ResearchPlan } from '../../types/research-gate.types';
import type { ResearchRequest } from '../../types/research.types';
import { ResearchOrchestratorManager } from '../research-orchestrator.manager';

// Research engine B1/B2: the council's plan reaches research-service (queries, languages, depth, round, thread),
// and a depth of 2-3 runs more rounds while a gap check finds something missing, within the round cap, the 60 s
// budget and the user's Stop.

vi.mock('../../../../common/utilities', async (importOriginal) => ({
  ...(await importOriginal<typeof CommonUtilities>()),
  runResearch: vi.fn(),
}));

const mockedRunResearch = vi.mocked(runResearch);

const runOf = (urls: string[], extra: Record<string, unknown> = {}): unknown => ({
  id: `run-${urls.join(',')}`,
  workflow: 'SEARCH_THEN_FETCH',
  bundle: {
    items: urls.map((url) => ({
      id: url,
      title: url,
      url,
      snippet: `text of ${url}`,
      confidence: 0.9,
    })),
    warnings: [],
    toolsUsed: ['web_search'],
    helperModels: [],
    providerSelection: { providerId: null },
    ...extra,
  },
});

const searchPlan = (overrides: Partial<ResearchPlan> = {}): ResearchPlan => ({
  action: PlannedResearchAction.SEARCH,
  urls: [],
  query: 'intel ceo resignation',
  maxPages: 12,
  narration: 'Searching.',
  thinking: '',
  decidedBy: 'council 3/3 of 4',
  subQuestions: ['intel ceo resignation', 'Who replaced him?', 'who replaced him?  '],
  languages: ['en', 'pt-BR', 'zh-Hans'],
  platforms: [],
  depth: 2,
  ...overrides,
});

const notDone = (queries: string[]): ResearchGapCheck => ({
  done: false,
  queries,
  narration: 'Looking up what is missing.',
  thinking: 'The date is missing.',
});

const DONE: ResearchGapCheck = {
  done: true,
  queries: [],
  narration: 'That is enough.',
  thinking: '',
};

const requestAt = (index: number): ResearchRequest =>
  mockedRunResearch.mock.calls[index]?.[1] as ResearchRequest;

describe('ResearchOrchestratorManager rounds (research engine B2)', () => {
  let plan: Mock<(...args: unknown[]) => Promise<ResearchPlan>>;
  let followUpAfterCrawl: ReturnType<typeof vi.fn>;
  let gapCheck: Mock<(...args: unknown[]) => Promise<ResearchGapCheck>>;
  let append: ReturnType<typeof vi.fn>;
  let manager: ResearchOrchestratorManager;
  const input = {
    userId: 'u1',
    userToken: 't',
    threadId: 'th1',
    intent: 'why did the intel ceo quit',
  };

  const entries = (): Array<{ kind: string; text?: string; params?: Record<string, unknown> }> =>
    append.mock.calls.map((call) => call[1] as { kind: string; params?: Record<string, unknown> });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      RESEARCH_SERVICE_URL: 'http://research.test',
    } as unknown as ReturnType<typeof AppConfig.get>);
    plan = vi.fn<(...args: unknown[]) => Promise<ResearchPlan>>();
    followUpAfterCrawl = vi.fn();
    gapCheck = vi.fn<(...args: unknown[]) => Promise<ResearchGapCheck>>().mockResolvedValue(DONE);
    append = vi.fn().mockResolvedValue(undefined);
    manager = new ResearchOrchestratorManager(
      { plan, followUpAfterCrawl, gapCheck } as never,
      { append } as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('round 1 sends the council queries (minus the primary), base languages, depth, round and thread', async () => {
    plan.mockResolvedValue(searchPlan({ depth: 1 }));
    mockedRunResearch.mockResolvedValue(runOf(['https://a.test']) as never);

    await manager.run(input);

    expect(mockedRunResearch).toHaveBeenCalledTimes(1);
    expect(requestAt(0)).toMatchObject({
      workflow: ResearchWorkflow.SEARCH_THEN_FETCH,
      searchQuery: 'intel ceo resignation',
      queries: ['Who replaced him?'],
      languages: ['en', 'pt', 'zh'],
      depth: 1,
      round: 1,
      threadId: 'th1',
      correlationId: 'th1',
    });
    expect(requestAt(0)).not.toHaveProperty('excludeUrls');
    // Depth 1 is one round: no gap check at all.
    expect(gapCheck).not.toHaveBeenCalled();
  });

  it('a plan with no council (no sub-questions, no languages) sends neither field', async () => {
    plan.mockResolvedValue(searchPlan({ subQuestions: [], languages: [], depth: 1 }));
    mockedRunResearch.mockResolvedValue(runOf(['https://a.test']) as never);

    await manager.run(input);

    expect(requestAt(0)).not.toHaveProperty('queries');
    expect(requestAt(0)).not.toHaveProperty('languages');
    expect(requestAt(0)).toMatchObject({ depth: 1, round: 1, threadId: 'th1' });
  });

  it('stops after round 1 when the gap check says done', async () => {
    plan.mockResolvedValue(searchPlan({ depth: 2 }));
    mockedRunResearch.mockResolvedValue(runOf(['https://a.test']) as never);

    const result = await manager.run(input);

    expect(mockedRunResearch).toHaveBeenCalledTimes(1);
    expect(gapCheck).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    // The gap check reads the evidence fenced as untrusted web data.
    expect(String(gapCheck.mock.calls[0]?.[1])).toContain('<web_source n="1" url="https://a.test"');
    expect(entries().find((entry) => entry.kind === NarrationKind.BACK_TO_AI)?.params).toEqual({
      round: 2,
    });
    // A "that is enough" line must not read as "Round 2": no round number unless that round runs.
    const replanned = entries().find((entry) => entry.kind === NarrationKind.REPLANNED);
    expect(replanned?.text).toBe('That is enough.');
    expect(replanned?.params).toBeUndefined();
  });

  it('runs a second round with the gap queries, excluding every URL already read, and merges', async () => {
    plan.mockResolvedValue(searchPlan({ depth: 2 }));
    gapCheck.mockResolvedValueOnce(
      notDone(['intel ceo resignation date', 'pat gelsinger successor']),
    );
    mockedRunResearch
      .mockResolvedValueOnce(runOf(['https://a.test', 'https://b.test']) as never)
      .mockResolvedValueOnce(runOf(['https://c.test']) as never);

    const result = (await manager.run(input)) as { bundle: { items: Array<{ url: string }> } };

    expect(mockedRunResearch).toHaveBeenCalledTimes(2);
    expect(requestAt(1)).toMatchObject({
      searchQuery: 'intel ceo resignation date',
      queries: ['pat gelsinger successor'],
      round: 2,
      depth: 2,
      excludeUrls: ['https://a.test', 'https://b.test'],
      threadId: 'th1',
    });
    expect(result.bundle.items.map((item) => item.url)).toEqual([
      'https://a.test',
      'https://b.test',
      'https://c.test',
    ]);
    // Depth 2 caps at two rounds: one gap check only.
    expect(gapCheck).toHaveBeenCalledTimes(1);
    // The queries already run are handed to the gap check so it does not repeat them.
    expect(gapCheck.mock.calls[0]?.[2]).toEqual(['intel ceo resignation', 'Who replaced him?']);
    const searchStarts = entries().filter((entry) => entry.kind === NarrationKind.SEARCH_STARTED);
    expect(searchStarts.map((entry) => entry.params)).toEqual([
      { query: 'intel ceo resignation', round: 1, queries: 2, languages: 'en, pt, zh' },
      { query: 'intel ceo resignation date', round: 2, queries: 2, languages: 'en, pt, zh' },
    ]);
  });

  it('caps the rounds at the depth, and clamps a council depth of 5 to 3', async () => {
    plan.mockResolvedValue(searchPlan({ depth: 5 }));
    gapCheck
      .mockResolvedValueOnce(notDone(['second query']))
      .mockResolvedValueOnce(notDone(['third query']))
      .mockResolvedValue(notDone(['fourth query']));
    mockedRunResearch
      .mockResolvedValueOnce(runOf(['https://a.test']) as never)
      .mockResolvedValueOnce(runOf(['https://b.test']) as never)
      .mockResolvedValueOnce(runOf(['https://c.test']) as never)
      .mockResolvedValue(runOf(['https://d.test']) as never);

    await manager.run(input);

    expect(mockedRunResearch).toHaveBeenCalledTimes(3);
    expect(gapCheck).toHaveBeenCalledTimes(2);
    expect(requestAt(0).depth).toBe(3);
    expect(requestAt(2)).toMatchObject({ round: 3, searchQuery: 'third query' });
  });

  it('stops when a round reads nothing new', async () => {
    plan.mockResolvedValue(searchPlan({ depth: 3 }));
    gapCheck.mockResolvedValue(notDone(['another angle']));
    mockedRunResearch
      .mockResolvedValueOnce(runOf(['https://a.test']) as never)
      .mockResolvedValueOnce(runOf(['https://a.test/']) as never);

    const result = (await manager.run(input)) as { bundle: { items: Array<{ url: string }> } };

    expect(mockedRunResearch).toHaveBeenCalledTimes(2);
    expect(gapCheck).toHaveBeenCalledTimes(1);
    expect(result.bundle.items.map((item) => item.url)).toEqual(['https://a.test']);
  });

  it('stops when the gap check offers only queries already searched', async () => {
    plan.mockResolvedValue(searchPlan({ depth: 3 }));
    gapCheck.mockResolvedValue(notDone(['INTEL CEO resignation']));
    mockedRunResearch.mockResolvedValue(runOf(['https://a.test']) as never);

    await manager.run(input);

    expect(mockedRunResearch).toHaveBeenCalledTimes(1);
    expect(gapCheck).toHaveBeenCalledTimes(1);
  });

  it('starts no round once the 60 s research budget is spent', async () => {
    let now = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    plan.mockResolvedValue(searchPlan({ depth: 3 }));
    gapCheck.mockResolvedValue(notDone(['second query']));
    mockedRunResearch.mockImplementation(async () => {
      now += 61_000;
      return runOf(['https://a.test']) as never;
    });

    await manager.run(input);

    expect(mockedRunResearch).toHaveBeenCalledTimes(1);
    expect(gapCheck).not.toHaveBeenCalled();
  });

  it('starts no round with less than 20 s of the budget left (a round takes 10-25 s)', async () => {
    let now = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    plan.mockResolvedValue(searchPlan({ depth: 3 }));
    gapCheck.mockResolvedValue(notDone(['second query']));
    mockedRunResearch.mockImplementation(async () => {
      now += 41_000;
      return runOf(['https://a.test']) as never;
    });

    await manager.run(input);

    expect(mockedRunResearch).toHaveBeenCalledTimes(1);
    expect(gapCheck).not.toHaveBeenCalled();
  });

  it('starts a round while at least 20 s of the budget is left', async () => {
    let now = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    plan.mockResolvedValue(searchPlan({ depth: 2 }));
    gapCheck.mockResolvedValue(notDone(['second query']));
    mockedRunResearch
      .mockImplementationOnce(async () => {
        now += 39_000;
        return runOf(['https://a.test']) as never;
      })
      .mockResolvedValueOnce(runOf(['https://b.test']) as never);

    await manager.run(input);

    expect(mockedRunResearch).toHaveBeenCalledTimes(2);
  });

  it('plans with the earlier conversation and lets the gap check read the resolved search', async () => {
    plan.mockResolvedValue(searchPlan({ depth: 2, query: 'the exact lyric line' }));
    gapCheck.mockResolvedValue(DONE);
    mockedRunResearch.mockResolvedValue(runOf(['https://a.test']) as never);

    await manager.run({
      ...input,
      intent: 'search again',
      conversation: 'User: the exact lyric line',
    });

    expect(plan).toHaveBeenCalledWith('search again', '', 'User: the exact lyric line');
    expect(gapCheck.mock.calls[0]?.[0]).toBe('search again\nSearching for: the exact lyric line');
    expect(requestAt(0).searchQuery).toBe('the exact lyric line');
  });

  it('sends the council source kinds on every round', async () => {
    plan.mockResolvedValue(
      searchPlan({ depth: 2, platforms: [ResearchPlatformCategory.ACADEMIC] }),
    );
    gapCheck.mockResolvedValue(notDone(['second query']));
    mockedRunResearch
      .mockResolvedValueOnce(runOf(['https://a.test']) as never)
      .mockResolvedValueOnce(runOf(['https://b.test']) as never);

    await manager.run(input);

    expect(requestAt(0).platforms).toEqual(['ACADEMIC']);
    expect(requestAt(1).platforms).toEqual(['ACADEMIC']);
  });

  it('sends no more expansion queries than the depth budget allows', async () => {
    plan.mockResolvedValue(
      searchPlan({ depth: 2, subQuestions: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] }),
    );
    gapCheck.mockResolvedValue({ done: true, queries: [], narration: '', thinking: '' });
    mockedRunResearch.mockResolvedValue(runOf(['https://a.test']) as never);

    await manager.run(input);

    const body = mockedRunResearch.mock.calls[0]?.[1] as { queries?: string[] };
    // depth 2 = 4 queries in all: the primary plus three.
    expect(body.queries).toHaveLength(3);
  });

  it('starts no round when the budget runs out during the gap check', async () => {
    let now = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    plan.mockResolvedValue(searchPlan({ depth: 3 }));
    gapCheck.mockImplementation(async () => {
      now += 61_000;
      return notDone(['second query']);
    });
    mockedRunResearch.mockResolvedValue(runOf(['https://a.test']) as never);

    const result = await manager.run(input);

    expect(gapCheck).toHaveBeenCalledTimes(1);
    expect(mockedRunResearch).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
  });

  it('carries the engine counters from bundle.stats on SEARCH_DONE, and nothing unmeasured', async () => {
    plan.mockResolvedValue(searchPlan({ depth: 1 }));
    mockedRunResearch.mockResolvedValue(
      runOf(['https://a.test'], {
        stats: {
          round: 1,
          queriesRun: 3,
          languages: ['en', 'ar'],
          duplicatesRemoved: 2,
          reusedFromThread: 1,
          pagesRead: 'many',
        },
      }) as never,
    );

    await manager.run(input);

    expect(entries().find((entry) => entry.kind === NarrationKind.SEARCH_DONE)?.params).toEqual({
      count: 1,
      warnings: 0,
      round: 1,
      queries: 3,
      languages: 'en, ar',
      duplicatesRemoved: 2,
      reusedFromThread: 1,
    });
  });

  it('a search after a crawl excludes the crawled pages and names the thread on both runs', async () => {
    plan.mockResolvedValue(
      searchPlan({
        action: PlannedResearchAction.CRAWL_THEN_SEARCH,
        urls: ['https://example.com/'],
        depth: 1,
      }),
    );
    followUpAfterCrawl.mockResolvedValue({
      needsSearch: true,
      query: 'example rivals',
      narration: '',
      thinking: '',
    });
    mockedRunResearch
      .mockResolvedValueOnce({
        ...(runOf(['https://example.com/']) as object),
        workflow: 'SITE_CRAWL',
      } as never)
      .mockResolvedValueOnce(runOf(['https://rival.test']) as never);

    await manager.run(input);

    expect(requestAt(0)).toMatchObject({ workflow: ResearchWorkflow.SITE_CRAWL, threadId: 'th1' });
    expect(requestAt(0)).not.toHaveProperty('depth');
    expect(requestAt(1)).toMatchObject({
      searchQuery: 'example rivals',
      round: 1,
      excludeUrls: ['https://example.com/'],
      threadId: 'th1',
    });
    // The re-plan reads the crawl fenced as untrusted web data.
    expect(String(followUpAfterCrawl.mock.calls[0]?.[1])).toContain(
      '<web_source n="1" url="https://example.com/" trust="untrusted">',
    );
  });

  describe('Stop', () => {
    const cancellationWith = (
      existing?: AbortController,
    ): {
      controller: AbortController;
      port: {
        getController: ReturnType<typeof vi.fn>;
        register: ReturnType<typeof vi.fn>;
        release: ReturnType<typeof vi.fn>;
        carryStop: ReturnType<typeof vi.fn>;
      };
    } => {
      const controller = new AbortController();
      return {
        controller,
        port: {
          getController: vi.fn().mockReturnValue(existing),
          register: vi.fn().mockReturnValue(controller),
          release: vi.fn(),
          carryStop: vi.fn(),
        },
      };
    };

    it('keeps the evidence already read and starts no new round after Stop', async () => {
      const { controller, port } = cancellationWith();
      manager = new ResearchOrchestratorManager(
        { plan, followUpAfterCrawl, gapCheck } as never,
        { append } as never,
        port as never,
      );
      plan.mockResolvedValue(searchPlan({ depth: 3 }));
      gapCheck.mockImplementation(async () => {
        controller.abort();
        return notDone(['second query']);
      });
      mockedRunResearch.mockResolvedValue(runOf(['https://a.test']) as never);

      const result = (await manager.run(input)) as { bundle: { items: Array<{ url: string }> } };

      expect(port.register).toHaveBeenCalledWith('th1');
      expect(mockedRunResearch).toHaveBeenCalledTimes(1);
      expect(result.bundle.items.map((item) => item.url)).toEqual(['https://a.test']);
      // Research released the thread's Stop key before the answering model registers its own.
      expect(port.release).toHaveBeenCalledWith('th1');
      // ...and carried the Stop, so the answer that follows starts stopped too.
      expect(port.carryStop).toHaveBeenCalledWith('th1');
      expect(entries().map((entry) => entry.kind)).not.toContain(NarrationKind.RESEARCH_FAILED);
    });

    it('carries nothing when research finished without a Stop', async () => {
      const { port } = cancellationWith();
      manager = new ResearchOrchestratorManager(
        { plan, followUpAfterCrawl, gapCheck } as never,
        { append } as never,
        port as never,
      );
      plan.mockResolvedValue(searchPlan({ depth: 1 }));
      mockedRunResearch.mockResolvedValue(runOf(['https://a.test']) as never);

      await manager.run(input);

      expect(port.release).toHaveBeenCalledWith('th1');
      expect(port.carryStop).not.toHaveBeenCalled();
    });

    it('carries nothing when the run was replaced by a newer run rather than stopped', async () => {
      const { controller, port } = cancellationWith();
      manager = new ResearchOrchestratorManager(
        { plan, followUpAfterCrawl, gapCheck } as never,
        { append } as never,
        port as never,
      );
      plan.mockImplementation(async () => {
        controller.abort(new DOMException(STREAM_RUN_REPLACED_MESSAGE, 'AbortError'));
        return searchPlan({ depth: 2 });
      });

      await manager.run(input);

      expect(port.carryStop).not.toHaveBeenCalled();
    });

    it('checks Stop before round 1: nothing is searched, nothing is narrated as failed', async () => {
      const { controller, port } = cancellationWith();
      manager = new ResearchOrchestratorManager(
        { plan, followUpAfterCrawl, gapCheck } as never,
        { append } as never,
        port as never,
      );
      plan.mockImplementation(async () => {
        controller.abort();
        return searchPlan({ depth: 2 });
      });

      await expect(manager.run(input)).resolves.toBeNull();
      expect(mockedRunResearch).not.toHaveBeenCalled();
      expect(entries().map((entry) => entry.kind)).not.toContain(NarrationKind.RESEARCH_FAILED);
    });

    it('listens to a run that already holds the thread key instead of replacing it', async () => {
      const existing = new AbortController();
      const { port } = cancellationWith(existing);
      manager = new ResearchOrchestratorManager(
        { plan, followUpAfterCrawl, gapCheck } as never,
        { append } as never,
        port as never,
      );
      plan.mockResolvedValue(searchPlan({ depth: 2 }));
      gapCheck.mockImplementation(async () => {
        existing.abort();
        return notDone(['second query']);
      });
      mockedRunResearch.mockResolvedValue(runOf(['https://a.test']) as never);

      await manager.run(input);

      expect(port.register).not.toHaveBeenCalled();
      expect(port.release).not.toHaveBeenCalled();
      expect(mockedRunResearch).toHaveBeenCalledTimes(1);
    });
  });
});
