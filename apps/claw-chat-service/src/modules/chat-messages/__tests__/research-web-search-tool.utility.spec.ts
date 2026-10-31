import { type Mock, vi } from 'vitest';

import { ResearchGatewayFailure } from '../enums/research-gateway-failure.enum';
import type * as GatewayModule from '../utilities/research-gateway.utility';
import type { ResearchGatewaySearchOutcome } from '../types/research-gateway.types';
import { executeResearchWebSearch } from '../utilities/ollama-cloud-tool-runner.utility';
import { gatewaySearchForUser } from '../utilities/research-gateway.utility';

vi.mock('../../../common/utilities', () => ({ httpRequest: vi.fn() }));
vi.mock('../utilities/research-gateway.utility', async (importOriginal) => ({
  ...(await importOriginal<typeof GatewayModule>()),
  gatewaySearchForUser: vi.fn(),
  gatewayToolFetch: vi.fn(),
}));

const { httpRequest } = (await vi.importMock('../../../common/utilities')) as {
  httpRequest: Mock;
};
const mockedGateway = vi.mocked(gatewaySearchForUser);

const call = (args: Record<string, unknown>) => ({
  function: { name: 'web_search', arguments: args },
});
const hosted = { baseUrl: 'https://ollama.com/api', apiKey: 'k', timeoutMs: 1000 };

const ok = (extra: Partial<ResearchGatewaySearchOutcome> = {}): ResearchGatewaySearchOutcome => ({
  ok: true,
  entries: [
    { url: 'https://a.test', title: 'A', snippet: 'about a', providers: ['Brave', 'Exa'] },
    { url: 'https://b.test', title: 'B', snippet: 'about b' },
  ],
  requestCount: 2,
  providers: [
    { name: 'Brave', ok: true },
    { name: 'Exa', ok: true },
  ],
  mode: 'AUTO_ALL',
  warnings: [],
  ...extra,
});

describe('executeResearchWebSearch (web_search through the research gateway)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the configured providers (all of them, AUTO) and never touches the hosted API', async () => {
    mockedGateway.mockResolvedValue(ok());
    const onDispatch = vi.fn(async () => {});
    const result = await executeResearchWebSearch(call({ query: 'cats', max_results: 3 }), {
      userId: 'u1',
      onDispatch,
      hosted,
    });
    expect(mockedGateway).toHaveBeenCalledWith({ userId: 'u1', query: 'cats', maxResults: 3 });
    expect(mockedGateway.mock.calls[0]?.[0]).not.toHaveProperty('providerId');
    expect(httpRequest).not.toHaveBeenCalled();
    // research-service meters its own provider calls: chat adds no second unit (rule 28).
    expect(onDispatch).not.toHaveBeenCalled();
    expect(JSON.parse(result)).toEqual({
      results: [
        { title: 'A', url: 'https://a.test', content: 'about a', foundBy: ['Brave', 'Exa'] },
        { title: 'B', url: 'https://b.test', content: 'about b' },
      ],
      providers: ['Brave', 'Exa'],
      mode: 'AUTO_ALL',
    });
  });

  it('works against the old research-service shape (no providers[], no mode)', async () => {
    mockedGateway.mockResolvedValue(ok({ providers: [], mode: undefined }));
    const result = JSON.parse(
      await executeResearchWebSearch(call({ query: 'cats' }), { userId: 'u1', hosted }),
    ) as Record<string, unknown>;
    expect(result.providers).toBeUndefined();
    expect(result.mode).toBeUndefined();
    expect(result.results).toHaveLength(2);
  });

  it('an empty answer from working providers is an answer: no hosted search', async () => {
    mockedGateway.mockResolvedValue(ok({ entries: [], warnings: [] }));
    const result = await executeResearchWebSearch(call({ query: 'zzz' }), {
      userId: 'u1',
      hosted,
    });
    expect(JSON.parse(result)).toMatchObject({ results: [] });
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it('falls back to the hosted search when research-service is unavailable, counting that search once', async () => {
    mockedGateway.mockResolvedValue({
      ok: false,
      failure: ResearchGatewayFailure.UNAVAILABLE,
      entries: [],
      requestCount: 1,
      providers: [],
      warnings: [],
    });
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { results: [{ url: 'https://h.test', title: 'H', content: 'hosted' }] },
    });
    const onDispatch = vi.fn(async () => {});
    const result = await executeResearchWebSearch(call({ query: 'cats' }), {
      userId: 'u1',
      onDispatch,
      hosted,
    });
    expect(httpRequest).toHaveBeenCalledTimes(1);
    expect(httpRequest.mock.calls[0]?.[0].url).toBe('https://ollama.com/api/web_search');
    expect(JSON.parse(result)).toEqual({
      results: [{ url: 'https://h.test', title: 'H', content: 'hosted' }],
    });
    expect(onDispatch).toHaveBeenCalledTimes(1);
  });

  it('falls back to the hosted search when research-service has no search provider', async () => {
    mockedGateway.mockResolvedValue(
      ok({ entries: [], providers: [], warnings: ['No search provider is enabled'] }),
    );
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: { results: [] } });
    await executeResearchWebSearch(call({ query: 'cats' }), { userId: 'u1', hosted });
    expect(httpRequest).toHaveBeenCalledTimes(1);
  });

  it('rejects a call without a query before spending anything', async () => {
    await expect(executeResearchWebSearch(call({}), { userId: 'u1', hosted })).rejects.toThrow(
      /query/,
    );
    expect(mockedGateway).not.toHaveBeenCalled();
  });
});
