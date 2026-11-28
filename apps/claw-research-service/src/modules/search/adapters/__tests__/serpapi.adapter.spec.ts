import { type Mock, vi } from 'vitest';

import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { SerpApiAdapter } from '../serpapi.adapter';
import { runSearchAdapterContract } from './search-adapter-contract';

global.fetch = vi.fn();

const onNetworkCall = vi.fn(async () => {});
const context = {
  baseUrl: 'https://serpapi.example',
  credentials: { apiKey: 'test-key' },
  publicConfig: {},
  timeoutMs: 1000,
  onNetworkCall,
};

const organic = (count: number, firstPosition = 1) => ({
  ok: true,
  json: async () => ({
    organic_results: Array.from({ length: count }, (_, index) => ({
      position: firstPosition + index,
      title: `T${String(firstPosition + index)}`,
      link: `https://x.example/${String(firstPosition + index)}`,
      snippet: 's',
    })),
  }),
});

/** The query string parameters of the first SerpApi request. */
const sentParams = (): URLSearchParams => {
  const [target] = (global.fetch as Mock).mock.calls[0] as [URL];
  return new URL(String(target)).searchParams;
};

describe('SerpApiAdapter (Google through SerpApi, ADR-228)', () => {
  runSearchAdapterContract(() => new SerpApiAdapter());

  const adapter = new SerpApiAdapter();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as Mock).mockResolvedValue(organic(3));
  });

  it('asks Google for the first page: engine, query, num, key; no start, no hl', async () => {
    const response = await adapter.search({ query: 'eu ai act', maxResults: 8 }, context);

    const params = sentParams();
    expect(params.get('engine')).toBe('google');
    expect(params.get('q')).toBe('eu ai act');
    expect(params.get('num')).toBe('8');
    expect(params.get('api_key')).toBe('test-key');
    expect(params.has('start')).toBe(false);
    expect(params.has('hl')).toBe(false);
    expect(response.results).toHaveLength(3);
    expect(response.results[0]?.providerKind).toBe(SearchProviderKind.SERPAPI);
  });

  it('a deeper page sends SerpApi start (10, 20, ...); start 0 or absent sends none', async () => {
    await adapter.search({ query: 'q', maxResults: 10, start: 20 }, context);
    expect(sentParams().get('start')).toBe('20');

    vi.clearAllMocks();
    await adapter.search({ query: 'q', maxResults: 10, start: 0 }, context);
    expect(sentParams().has('start')).toBe(false);
  });

  it.each([
    ['de', 'de'],
    ['ar', 'ar'],
    ['fil', 'fil'],
    ['zh', 'zh-cn'],
    ['he', 'iw'],
  ])('filters.language %s is sent as hl=%s', async (language, hl) => {
    await adapter.search({ query: 'q', maxResults: 10, filters: { language } }, context);

    expect(sentParams().get('hl')).toBe(hl);
  });

  it.each([
    ['a region tag', 'pt-BR'],
    ['upper case', 'EN'],
    ['a whole word', 'english'],
    ['one letter', 'e'],
    ['a number', 7],
    ['an empty string', ''],
    ['nothing', undefined],
  ])('%s is not a query language, so no hl is sent', async (_name, language) => {
    await adapter.search({ query: 'q', maxResults: 10, filters: { language } }, context);

    expect(sentParams().has('hl')).toBe(false);
  });

  it('records exactly one network call per search (one paid unit per page)', async () => {
    await adapter.search({ query: 'q', maxResults: 10 }, context);
    await adapter.search({ query: 'q', maxResults: 10, start: 10 }, context);

    expect(onNetworkCall).toHaveBeenCalledTimes(2);
  });

  it('a page past the end (no organic_results) is an empty answer, not an error', async () => {
    (global.fetch as Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

    const response = await adapter.search({ query: 'q', maxResults: 10, start: 90 }, context);

    expect(response.results).toEqual([]);
  });

  it('a position past maxResults never gives a negative score', async () => {
    (global.fetch as Mock).mockResolvedValue(organic(3, 18));

    const response = await adapter.search({ query: 'q', maxResults: 10, start: 10 }, context);

    expect(response.results.every((result) => result.score >= 0 && result.score <= 1)).toBe(true);
  });

  it('an HTTP failure throws, so the caller counts it against the breaker', async () => {
    (global.fetch as Mock).mockResolvedValue({ ok: false, status: 429 });

    await expect(adapter.search({ query: 'q', maxResults: 10 }, context)).rejects.toThrow(
      /HTTP 429/,
    );
  });

  it('the health check pings with one result and never a start or hl', async () => {
    (global.fetch as Mock).mockResolvedValue({ ok: true });

    await adapter.healthCheck(context);

    const params = sentParams();
    expect(params.get('q')).toBe('ping');
    expect(params.get('num')).toBe('1');
    expect(params.has('start')).toBe(false);
    expect(params.has('hl')).toBe(false);
  });
});
