import { ResearchEnricherManager } from '../research-enricher.manager';
import { ResearchMode } from '../../../../common/enums/research-mode.enum';

jest.mock('../../../../common/utilities', () => ({
  httpRequest: jest.fn(),
}));
jest.mock('../../../../app/config/app.config');

const { httpRequest } = jest.requireMock('../../../../common/utilities') as {
  httpRequest: jest.Mock;
};
const { AppConfig } = jest.requireMock('../../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};

const RESEARCH_URL = 'http://research-service:4016';
const AUTH_HEADER = 'Bearer abc.def.ghi';

describe('ResearchEnricherManager', () => {
  let manager: ResearchEnricherManager;

  beforeEach(() => {
    jest.clearAllMocks();
    AppConfig.get.mockReturnValue({ RESEARCH_SERVICE_URL: RESEARCH_URL });
    manager = new ResearchEnricherManager();
  });

  it('NONE: returns empty evidence + sources, never calls fetch', async () => {
    const result = await manager.enrich({
      mode: ResearchMode.NONE,
      query: 'what is the weather today',
      userAuthHeader: AUTH_HEADER,
    });

    expect(result).toEqual({ evidence: '', sources: [], mode: ResearchMode.NONE });
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it('SEARCH: calls /research/search once, formats evidence with snippets, no fetch', async () => {
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        runId: 'run-1',
        providerKind: 'tavily',
        results: [
          { id: 'r1', title: 'GPT-5 launches', url: 'https://news/gpt5', snippet: 'OpenAI shipped GPT-5 today.' },
          { id: 'r2', title: 'Reactions', url: 'https://news/reactions', snippet: 'Industry reacts.' },
        ],
      },
    });

    const result = await manager.enrich({
      mode: ResearchMode.SEARCH,
      query: 'what happened with gpt-5',
      userAuthHeader: AUTH_HEADER,
    });

    expect(httpRequest).toHaveBeenCalledTimes(1);
    const call = httpRequest.mock.calls[0][0];
    expect(call.url).toBe(`${RESEARCH_URL}/api/v1/research/search`);
    expect(call.method).toBe('POST');
    expect(call.headers).toEqual({ Authorization: AUTH_HEADER });
    expect(call.body).toEqual({ query: 'what happened with gpt-5', maxResults: 5 });

    expect(result.mode).toBe(ResearchMode.SEARCH);
    expect(result.sources).toHaveLength(2);
    const [first] = result.sources;
    if (!first) throw new Error('expected first source');
    expect(first).toEqual({
      title: 'GPT-5 launches',
      url: 'https://news/gpt5',
      snippet: 'OpenAI shipped GPT-5 today.',
    });
    expect(result.evidence).toContain('## Web research evidence (mode: SEARCH');
    expect(result.evidence).toContain('[1] GPT-5 launches — https://news/gpt5');
    expect(result.evidence).toContain('OpenAI shipped GPT-5 today.');
    expect(result.evidence).toContain('[2] Reactions — https://news/reactions');
  });

  it('SEARCH_FETCH: calls search then fetch for top N URLs, falls back to snippet when one fetch errors', async () => {
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        runId: 'run-2',
        providerKind: 'tavily',
        results: [
          { id: 'r1', title: 'Article 1', url: 'https://a/1', snippet: 'snippet-1' },
          { id: 'r2', title: 'Article 2', url: 'https://a/2', snippet: 'snippet-2' },
          { id: 'r3', title: 'Article 3', url: 'https://a/3', snippet: 'snippet-3' },
        ],
      },
    });
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { url: 'https://a/1', content: 'Full article body 1.', httpStatus: 200 },
    });
    httpRequest.mockRejectedValueOnce(new Error('network error'));
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { url: 'https://a/3', content: 'Full article body 3.', httpStatus: 200 },
    });

    const result = await manager.enrich({
      mode: ResearchMode.SEARCH_FETCH,
      query: 'gpt-5 news',
      userAuthHeader: AUTH_HEADER,
      topResults: 3,
      topFetch: 3,
    });

    expect(httpRequest).toHaveBeenCalledTimes(4);
    expect(httpRequest.mock.calls[0][0].url).toBe(`${RESEARCH_URL}/api/v1/research/search`);
    expect(httpRequest.mock.calls[1][0].url).toBe(`${RESEARCH_URL}/api/v1/research/fetch`);
    expect(httpRequest.mock.calls[1][0].body).toEqual({ url: 'https://a/1' });
    expect(httpRequest.mock.calls[2][0].body).toEqual({ url: 'https://a/2' });
    expect(httpRequest.mock.calls[3][0].body).toEqual({ url: 'https://a/3' });

    expect(result.sources).toHaveLength(3);
    const [first, second, third] = result.sources;
    if (!first || !second || !third) throw new Error('expected three sources');
    expect(first.extracted).toBe('Full article body 1.');
    expect(second.extracted).toBeUndefined();
    expect(second.snippet).toBe('snippet-2');
    expect(third.extracted).toBe('Full article body 3.');
    expect(result.evidence).toContain('Full article body 1.');
    expect(result.evidence).toContain('snippet-2');
    expect(result.evidence).toContain('Full article body 3.');
  });

  it('SEARCH_EXTRACT: routes via /research/fetch using the cleaned content field with a larger excerpt budget', async () => {
    const longContent = 'X'.repeat(3_000);
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        runId: 'run-3',
        providerKind: 'tavily',
        results: [{ id: 'r1', title: 'Doc', url: 'https://docs/a', snippet: 's' }],
      },
    });
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { url: 'https://docs/a', content: longContent, httpStatus: 200 },
    });

    const result = await manager.enrich({
      mode: ResearchMode.SEARCH_EXTRACT,
      query: 'react server components',
      userAuthHeader: AUTH_HEADER,
      topResults: 1,
      topFetch: 1,
    });

    expect(httpRequest).toHaveBeenCalledTimes(2);
    expect(httpRequest.mock.calls[1][0].url).toBe(`${RESEARCH_URL}/api/v1/research/fetch`);
    expect(result.sources).toHaveLength(1);
    const [only] = result.sources;
    if (!only) throw new Error('expected one source');
    expect(only.extracted?.length).toBe(2_500);
    expect(result.evidence).toContain('## Web research evidence (mode: SEARCH_EXTRACT');
  });

  it('empty search results: evidence == "## Web search returned no results.", sources == []', async () => {
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { runId: 'run-4', providerKind: 'tavily', results: [] },
    });

    const result = await manager.enrich({
      mode: ResearchMode.SEARCH,
      query: 'no-hits-query',
      userAuthHeader: AUTH_HEADER,
    });

    expect(httpRequest).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      evidence: '## Web search returned no results.',
      sources: [],
      mode: ResearchMode.SEARCH,
    });
  });

  it('non-ok search response: returns the empty-results block without throwing', async () => {
    httpRequest.mockResolvedValueOnce({ ok: false, status: 502, data: {} });
    const result = await manager.enrich({
      mode: ResearchMode.SEARCH,
      query: 'q',
      userAuthHeader: AUTH_HEADER,
    });
    expect(result.evidence).toBe('## Web search returned no results.');
    expect(result.sources).toEqual([]);
  });
});
