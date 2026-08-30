import { Test, type TestingModule } from '@nestjs/testing';

import {
  SEARCH_FIRST_WARNING_EXCEPTION,
  SEARCH_FIRST_WARNING_HTTP_ERROR,
  SEARCH_FIRST_WARNING_NO_RESULTS,
} from '../constants/search-first.constants';
import { SearchFirstManager } from '../managers/search-first.manager';
import type { AssembledContext } from '../types/context.types';
import type { ResearchSearchResponse } from '../types/search-first.types';
import {
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../utilities/assembled-context.utility';

jest.mock('../../../common/utilities', () => ({
  httpRequest: jest.fn(),
}));
jest.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn().mockReturnValue({ RESEARCH_SERVICE_URL: 'http://research:4016' }),
  },
}));

const { httpRequest } = jest.requireMock('../../../common/utilities') as {
  httpRequest: jest.Mock;
};

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
    tokenBudget: 4000,
    modelBudget: fallbackModelTokenBudget(),
    conversationManifest: emptyConversationManifest(),
  };
}

function makeSearchResponse(
  overrides: Partial<ResearchSearchResponse> = {},
): ResearchSearchResponse {
  return {
    runId: 'run-1',
    providerKind: 'TAVILY',
    results: [
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
      },
    ],
    ...overrides,
  };
}

describe('SearchFirstManager', () => {
  let manager: SearchFirstManager;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchFirstManager],
    }).compile();
    manager = module.get<SearchFirstManager>(SearchFirstManager);
  });

  describe('happy path', () => {
    it('applies results and injects them into the system prompt', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: makeSearchResponse(),
      });
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

    it('works when the original systemPrompt is null', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: makeSearchResponse(),
      });
      const { context, outcome } = await manager.run('latest news', makeContext(null));
      expect(outcome.applied).toBe(true);
      expect(context.systemPrompt).toContain('SEARCH RESULTS');
      expect(context.systemPrompt).not.toContain('You are a helpful assistant.');
    });

    it('truncates the query to 512 chars before posting', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: makeSearchResponse(),
      });
      const big = 'x'.repeat(600);
      await manager.run(big, makeContext());
      const args = httpRequest.mock.calls[0]?.[0];
      const body = args.body as { query: string };
      expect(body.query.length).toBeLessThanOrEqual(512);
    });

    it('caps results to SEARCH_FIRST_MAX_RESULTS', async () => {
      const tenResults = Array.from({ length: 10 }, (_, i) => ({
        id: `r${String(i)}`,
        title: `Result ${String(i)}`,
        url: `https://example.com/${String(i)}`,
        snippet: 's',
        publishedAt: null,
        providerKind: 'TAVILY',
      }));
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: makeSearchResponse({ results: tenResults }),
      });
      const { outcome } = await manager.run('news', makeContext());
      expect(outcome.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('graceful degradation', () => {
    it('returns warning=NO_RESULTS and original context when query is empty', async () => {
      const ctx = makeContext('original sys');
      const { context, outcome } = await manager.run('   ', ctx);
      expect(outcome.applied).toBe(false);
      expect(outcome.warning).toBe(SEARCH_FIRST_WARNING_NO_RESULTS);
      expect(context).toBe(ctx);
      expect(httpRequest).not.toHaveBeenCalled();
    });

    it('returns warning=HTTP_ERROR on non-200 response and keeps context', async () => {
      httpRequest.mockResolvedValue({ ok: false, status: 500, data: { error: 'boom' } });
      const ctx = makeContext('original sys');
      const { context, outcome } = await manager.run('latest news', ctx);
      expect(outcome.applied).toBe(false);
      expect(outcome.warning).toBe(SEARCH_FIRST_WARNING_HTTP_ERROR);
      expect(context.systemPrompt).toBe('original sys');
    });

    it('returns warning=NO_RESULTS when results array is empty', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: makeSearchResponse({ results: [] }),
      });
      const { outcome } = await manager.run('latest news', makeContext());
      expect(outcome.applied).toBe(false);
      expect(outcome.warning).toBe(SEARCH_FIRST_WARNING_NO_RESULTS);
    });

    it('returns warning=EXCEPTION when httpRequest throws', async () => {
      httpRequest.mockRejectedValue(new Error('socket hang up'));
      const ctx = makeContext('original sys');
      const { context, outcome } = await manager.run('latest news', ctx);
      expect(outcome.applied).toBe(false);
      expect(outcome.warning).toBe(SEARCH_FIRST_WARNING_EXCEPTION);
      expect(context.systemPrompt).toBe('original sys');
    });

    it('returns warning=NO_RESULTS when payload is missing the results field', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { runId: 'r1', providerKind: 'TAVILY' },
      });
      const { outcome } = await manager.run('latest news', makeContext());
      expect(outcome.applied).toBe(false);
      expect(outcome.warning).toBe(SEARCH_FIRST_WARNING_NO_RESULTS);
    });
  });

  describe('snippet truncation', () => {
    it('truncates a long snippet to SEARCH_FIRST_MAX_SNIPPET_CHARS', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: makeSearchResponse({
          results: [
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
      });
      const { outcome } = await manager.run('hello', makeContext());
      expect(outcome.results[0]?.snippet?.length ?? 0).toBeLessThanOrEqual(280);
    });

    it('keeps null snippets as null', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: makeSearchResponse({
          results: [
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
      });
      const { outcome } = await manager.run('hello', makeContext());
      expect(outcome.results[0]?.snippet).toBeNull();
    });
  });
});
