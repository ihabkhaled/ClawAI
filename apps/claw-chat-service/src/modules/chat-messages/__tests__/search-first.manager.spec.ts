import { vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  SEARCH_FIRST_MAX_RESULTS,
  SEARCH_FIRST_MAX_SNIPPET_CHARS,
  SEARCH_FIRST_WARNING_ALREADY_RESEARCHED,
  SEARCH_FIRST_WARNING_EXCEPTION,
  SEARCH_FIRST_WARNING_HTTP_ERROR,
  SEARCH_FIRST_WARNING_NO_RESULTS,
  SEARCH_FIRST_WARNING_TIMEOUT,
} from '../constants/search-first.constants';
import { ResearchGatewayFailure } from '../enums/research-gateway-failure.enum';
import { SearchFirstManager } from '../managers/search-first.manager';
import type { AssembledContext } from '../types/context.types';
import type { ResearchGatewaySearchOutcome } from '../types/research-gateway.types';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../utilities/assembled-context.utility';
import { gatewaySearchForUser } from '../utilities/research-gateway.utility';

// search-first no longer owns a research client (ADR-212): it asks the gateway, so the
// gateway is what these tests stand in for.
vi.mock('../utilities/research-gateway.utility', () => ({
  gatewaySearchForUser: vi.fn(),
}));

const mockedSearch = vi.mocked(gatewaySearchForUser);

function makeContext(systemPrompt: string | null = null): AssembledContext {
  return {
    userId: 'user-1',
    systemPrompt,
    threadMessages: [],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    researchRequested: false,
    researchToolsUsed: [],
    tokenBudget: 4000,
    modelBudget: fallbackModelTokenBudget(),
    conversationManifest: emptyConversationManifest(),
    crossThread: disabledCrossThreadResult(),
  };
}

function gateway(
  overrides: Partial<ResearchGatewaySearchOutcome> = {},
): ResearchGatewaySearchOutcome {
  return {
    ok: true,
    entries: [
      {
        id: 'r1',
        title: 'OpenAI announcement',
        url: 'https://openai.com/blog/announcement',
        snippet: 'Something happened today.',
        publishedAt: '2026-05-27',
        providerKind: 'TAVILY',
      },
      {
        id: 'r2',
        title: 'Coverage from TechCrunch',
        url: 'https://techcrunch.com/article',
        snippet: 'Reporters say the new model is fast.',
        publishedAt: null,
        providerKind: 'TAVILY',
        providers: ['Brave', 'Tavily'],
      },
    ],
    requestCount: 2,
    runId: 'run-1',
    providers: [],
    warnings: [],
    ...overrides,
  };
}

function failed(failure: ResearchGatewayFailure): ResearchGatewaySearchOutcome {
  return { ok: false, failure, entries: [], requestCount: 1, providers: [], warnings: [] };
}

describe('SearchFirstManager', () => {
  let manager: SearchFirstManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchFirstManager],
    }).compile();
    manager = module.get<SearchFirstManager>(SearchFirstManager);
  });

  describe('happy path', () => {
    it('applies results and injects them into the system prompt', async () => {
      mockedSearch.mockResolvedValue(gateway());
      const ctx = makeContext('You are a helpful assistant.');
      const { context, outcome } = await manager.run('what is the latest news', ctx);
      expect(outcome.applied).toBe(true);
      expect(outcome.results).toHaveLength(2);
      expect(outcome.runId).toBe('run-1');
      expect(outcome.warning).toBeNull();
      expect(context.systemPrompt).toContain('You are a helpful assistant.');
      expect(context.systemPrompt).toContain('SEARCH RESULTS');
      expect(context.systemPrompt).toContain('OpenAI announcement');
      expect(context.systemPrompt).toContain('https://openai.com/blog/announcement');
    });

    it('names every provider that returned a page, and the user it searched for', async () => {
      mockedSearch.mockResolvedValue(gateway());
      const { context } = await manager.run('latest news', makeContext());
      expect(context.systemPrompt).toContain('Source: Brave, Tavily');
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', maxResults: SEARCH_FIRST_MAX_RESULTS }),
      );
    });

    it('works when the original systemPrompt is null', async () => {
      mockedSearch.mockResolvedValue(gateway());
      const { context, outcome } = await manager.run('latest news', makeContext(null));
      expect(outcome.applied).toBe(true);
      expect(context.systemPrompt).toContain('SEARCH RESULTS');
    });

    it('truncates the query to 512 chars before searching', async () => {
      mockedSearch.mockResolvedValue(gateway());
      await manager.run('x'.repeat(600), makeContext());
      expect(mockedSearch.mock.calls[0]?.[0].query.length).toBeLessThanOrEqual(512);
    });

    it('caps results to SEARCH_FIRST_MAX_RESULTS', async () => {
      const many = Array.from({ length: 20 }, (_, i) => ({
        id: `r${String(i)}`,
        title: `Result ${String(i)}`,
        url: `https://example.com/${String(i)}`,
        snippet: 's',
        publishedAt: null,
        providerKind: 'TAVILY',
      }));
      mockedSearch.mockResolvedValue(gateway({ entries: many }));
      const { outcome } = await manager.run('news', makeContext());
      expect(outcome.results.length).toBeLessThanOrEqual(SEARCH_FIRST_MAX_RESULTS);
    });
  });

  describe('waits for the gateway before the model can start', () => {
    it('does not resolve until every provider has settled', async () => {
      let release!: (value: ResearchGatewaySearchOutcome) => void;
      mockedSearch.mockReturnValue(
        new Promise<ResearchGatewaySearchOutcome>((resolve) => {
          release = resolve;
        }),
      );
      let modelStarted = false;
      const turn = manager.run('latest news', makeContext()).then(() => {
        modelStarted = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(modelStarted).toBe(false);
      release(gateway());
      await turn;
      expect(modelStarted).toBe(true);
    });
  });

  describe('a turn that already has web evidence', () => {
    it('does not search a second time', async () => {
      const { outcome } = await manager.run('latest news', {
        ...makeContext('sys'),
        researchRequested: true,
      });
      expect(outcome.applied).toBe(false);
      expect(outcome.warning).toBe(SEARCH_FIRST_WARNING_ALREADY_RESEARCHED);
      expect(mockedSearch).not.toHaveBeenCalled();
    });
  });

  describe('graceful degradation', () => {
    it('returns warning=NO_RESULTS and original context when query is empty', async () => {
      const ctx = makeContext('original sys');
      const { context, outcome } = await manager.run('   ', ctx);
      expect(outcome.applied).toBe(false);
      expect(outcome.warning).toBe(SEARCH_FIRST_WARNING_NO_RESULTS);
      expect(context).toBe(ctx);
      expect(mockedSearch).not.toHaveBeenCalled();
    });

    it.each([
      [ResearchGatewayFailure.HTTP_ERROR, SEARCH_FIRST_WARNING_HTTP_ERROR],
      [ResearchGatewayFailure.UNAVAILABLE, SEARCH_FIRST_WARNING_HTTP_ERROR],
      [ResearchGatewayFailure.TIMEOUT, SEARCH_FIRST_WARNING_TIMEOUT],
      [ResearchGatewayFailure.EXCEPTION, SEARCH_FIRST_WARNING_EXCEPTION],
    ])('maps gateway failure %s to warning %s and keeps the context', async (failure, warning) => {
      mockedSearch.mockResolvedValue(failed(failure));
      const ctx = makeContext('original sys');
      const { context, outcome } = await manager.run('latest news', ctx);
      expect(outcome.applied).toBe(false);
      expect(outcome.warning).toBe(warning);
      expect(context.systemPrompt).toBe('original sys');
    });

    it('returns warning=NO_RESULTS when the gateway found nothing', async () => {
      mockedSearch.mockResolvedValue(gateway({ entries: [] }));
      const { outcome } = await manager.run('latest news', makeContext());
      expect(outcome.applied).toBe(false);
      expect(outcome.warning).toBe(SEARCH_FIRST_WARNING_NO_RESULTS);
    });
  });

  describe('snippet truncation', () => {
    it('truncates a long snippet to SEARCH_FIRST_MAX_SNIPPET_CHARS', async () => {
      mockedSearch.mockResolvedValue(
        gateway({
          entries: [
            {
              id: 'r1',
              title: 'Long Article',
              url: 'https://example.com',
              snippet: 'a'.repeat(2000),
              publishedAt: null,
              providerKind: 'TAVILY',
            },
          ],
        }),
      );
      const { outcome } = await manager.run('hello', makeContext());
      expect(outcome.results[0]?.snippet?.length ?? 0).toBeLessThanOrEqual(
        SEARCH_FIRST_MAX_SNIPPET_CHARS,
      );
    });

    it('keeps null snippets as null', async () => {
      mockedSearch.mockResolvedValue(
        gateway({
          entries: [
            {
              id: 'r1',
              title: 'No snippet article',
              url: 'https://example.com',
              snippet: null,
              publishedAt: null,
              providerKind: 'TAVILY',
            },
          ],
        }),
      );
      const { outcome } = await manager.run('hello', makeContext());
      expect(outcome.results[0]?.snippet).toBeNull();
    });
  });
});
