import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RESEARCH_GATEWAY_FETCH_TIMEOUT_MS,
  RESEARCH_GATEWAY_SEARCH_TIMEOUT_MS,
  RESEARCH_REQUEST_TIMEOUT_MS,
  RESEARCH_SERVICE_FETCH_PHASE_BOUND_MS,
  RESEARCH_SERVICE_SEARCH_PHASE_BOUND_MS,
} from '../../../common/constants/research-client.constants';
import { ResearchWorkflow } from '../../../common/enums/research-workflow.enum';
import { httpRequest, runResearch } from '../../../common/utilities';
import { RESEARCH_GATEWAY_FETCH_CONCURRENCY } from '../constants/research-gateway.constants';
import { ResearchGatewayFailure } from '../enums/research-gateway-failure.enum';
import {
  describeGatewayProviders,
  gatewayFetchPages,
  gatewayRun,
  gatewaySearch,
  gatewaySearchForUser,
  isNoProviderConfigured,
  mapResearchGatewayFailure,
  parseGatewayProviders,
  providersOfBundle,
} from '../utilities/research-gateway.utility';

vi.mock('../../../common/utilities', () => ({
  httpRequest: vi.fn(),
  runResearch: vi.fn(),
  fetchPageViaResearch: vi.fn(),
}));
vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn().mockReturnValue({ RESEARCH_SERVICE_URL: 'http://research.test' }) },
}));

const mockedHttp = vi.mocked(httpRequest);
const mockedRun = vi.mocked(runResearch);

const searchWire = (
  extra: Record<string, unknown> = {},
): { ok: true; status: 200; data: unknown } => ({
  ok: true,
  status: 200,
  data: {
    runId: 'run-1',
    results: [{ url: 'https://a.test', title: 'A', snippet: 'a' }],
    searchRequestCount: 3,
    ...extra,
  },
});

describe('research gateway timeouts', () => {
  it('search budget is strictly larger than research-service search bound, and >= 22 s', () => {
    expect(RESEARCH_GATEWAY_SEARCH_TIMEOUT_MS).toBeGreaterThan(
      RESEARCH_SERVICE_SEARCH_PHASE_BOUND_MS,
    );
    expect(RESEARCH_GATEWAY_SEARCH_TIMEOUT_MS).toBeGreaterThanOrEqual(22_000);
  });

  it('fetch budget is strictly larger than research-service fetch bound, and >= 35 s', () => {
    expect(RESEARCH_GATEWAY_FETCH_TIMEOUT_MS).toBeGreaterThan(
      RESEARCH_SERVICE_FETCH_PHASE_BOUND_MS,
    );
    expect(RESEARCH_GATEWAY_FETCH_TIMEOUT_MS).toBeGreaterThanOrEqual(35_000);
  });

  it('a whole run is never shorter than its two phases back to back', () => {
    expect(RESEARCH_REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(
      RESEARCH_GATEWAY_SEARCH_TIMEOUT_MS + RESEARCH_GATEWAY_FETCH_TIMEOUT_MS,
    );
  });
});

describe('research gateway error mapping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps an aborted call to TIMEOUT and any other throw to EXCEPTION', () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    expect(mapResearchGatewayFailure(abort)).toBe(ResearchGatewayFailure.TIMEOUT);
    expect(mapResearchGatewayFailure(new Error('ECONNREFUSED'))).toBe(
      ResearchGatewayFailure.EXCEPTION,
    );
  });

  it('search: a non-2xx answer is HTTP_ERROR with the status, never a throw', async () => {
    mockedHttp.mockResolvedValue({ ok: false, status: 502, data: {} });
    const outcome = await gatewaySearch({ query: 'q', maxResults: 5, authorization: 'Bearer t' });
    expect(outcome).toMatchObject({
      ok: false,
      failure: ResearchGatewayFailure.HTTP_ERROR,
      status: 502,
      entries: [],
    });
  });

  it('search: a deadline is TIMEOUT, a thrown error is EXCEPTION', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    mockedHttp.mockRejectedValueOnce(abort).mockRejectedValueOnce(new Error('boom'));
    const input = { query: 'q', maxResults: 5, authorization: 'Bearer t' };
    expect((await gatewaySearch(input)).failure).toBe(ResearchGatewayFailure.TIMEOUT);
    expect((await gatewaySearch(input)).failure).toBe(ResearchGatewayFailure.EXCEPTION);
  });

  it('search uses the gateway search timeout on the user route and sends the explicit provider only when chosen', async () => {
    mockedHttp.mockResolvedValue(searchWire() as never);
    await gatewaySearch({ query: 'q', maxResults: 5, authorization: 'Bearer t' });
    await gatewaySearch({
      query: 'q',
      maxResults: 5,
      authorization: 'Bearer t',
      providerId: 'prov-1',
    });
    const [auto, explicit] = mockedHttp.mock.calls.map(([call]) => call);
    expect(auto?.timeoutMs).toBe(RESEARCH_GATEWAY_SEARCH_TIMEOUT_MS);
    expect(auto?.url).toBe('http://research.test/api/v1/research/search');
    expect(auto?.body).toEqual({ query: 'q', maxResults: 5 });
    expect(explicit?.body).toEqual({ query: 'q', maxResults: 5, providerId: 'prov-1' });
  });

  it('internal search: no usable run is UNAVAILABLE', async () => {
    mockedRun.mockResolvedValue(null);
    const outcome = await gatewaySearchForUser({ userId: 'u1', query: 'q', maxResults: 5 });
    expect(outcome.ok).toBe(false);
    expect(outcome.failure).toBe(ResearchGatewayFailure.UNAVAILABLE);
  });
});

describe('research gateway providers[] (present and absent)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads providers[], mode and provenance when research-service sends them', async () => {
    mockedHttp.mockResolvedValue(
      searchWire({
        mode: 'AUTO_ALL',
        providers: [
          { name: 'Brave', kind: 'BRAVE', status: 'OK', resultCount: 5, latencyMs: 400 },
          { name: 'Exa', kind: 'EXA', status: 'TIMEOUT', resultCount: 0, latencyMs: 20000 },
        ],
      }) as never,
    );
    const outcome = await gatewaySearch({ query: 'q', maxResults: 5, authorization: 'Bearer t' });
    expect(outcome.mode).toBe('AUTO_ALL');
    expect(outcome.providers).toEqual([
      { name: 'Brave', ok: true, resultCount: 5 },
      { name: 'Exa', ok: false, resultCount: 0 },
    ]);
    expect(describeGatewayProviders(outcome.providers)).toEqual(['Brave', 'Exa']);
  });

  it('treats a missing providers[] and mode as the old shape', async () => {
    mockedHttp.mockResolvedValue(searchWire() as never);
    const outcome = await gatewaySearch({ query: 'q', maxResults: 5, authorization: 'Bearer t' });
    expect(outcome.ok).toBe(true);
    expect(outcome.providers).toEqual([]);
    expect(outcome.mode).toBeUndefined();
    expect(outcome.entries).toHaveLength(1);
  });

  it('tolerates junk in providers[] without throwing', () => {
    expect(parseGatewayProviders(undefined)).toEqual([]);
    expect(parseGatewayProviders('Brave')).toEqual([]);
    expect(parseGatewayProviders([null, 4, {}, 'Exa', { providerName: 'Tavily' }])).toEqual([
      { name: 'Exa', ok: true },
      { name: 'Tavily', ok: true },
    ]);
  });

  it('never derives the search unit count from the provider count (rule 28)', async () => {
    mockedHttp.mockResolvedValue(
      searchWire({
        searchRequestCount: 1,
        providers: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
      }) as never,
    );
    const outcome = await gatewaySearch({ query: 'q', maxResults: 5, authorization: 'Bearer t' });
    expect(outcome.providers).toHaveLength(3);
    expect(outcome.requestCount).toBe(1);
  });

  it('on the run route, falls back to the attempted providers of the old bundle shape', async () => {
    mockedRun.mockResolvedValue({
      id: 'run-9',
      bundle: {
        items: [
          {
            id: 'i1',
            title: 'T',
            url: 'https://t.test',
            snippet: 's',
            providerKind: 'BRAVE',
            publishedAt: null,
          },
        ],
        warnings: [],
        providerSelection: {
          providerId: 'p1',
          providerName: 'Brave',
          fallbackUsed: false,
          attemptedProviders: ['Brave', 'Ollama'],
        },
      },
    } as never);
    const outcome = await gatewaySearchForUser({ userId: 'u1', query: 'q', maxResults: 5 });
    expect(outcome.ok).toBe(true);
    expect(outcome.providers.map((p) => p.name)).toEqual(['Brave', 'Ollama']);
    expect(mockedRun.mock.calls[0]?.[1]).toMatchObject({
      workflow: ResearchWorkflow.SEARCH_ONLY,
      userId: 'u1',
      timeoutMs: RESEARCH_GATEWAY_SEARCH_TIMEOUT_MS,
    });
  });

  it('providersOfBundle prefers providers[] over attemptedProviders', () => {
    const names = providersOfBundle({
      providers: [{ name: 'Exa', status: 'OK' }],
      providerSelection: { attemptedProviders: ['Other'] },
    } as never).map((p) => p.name);
    expect(names).toEqual(['Exa']);
  });

  it('isNoProviderConfigured is true only for an empty answer that says no provider ran', () => {
    const base = { ok: true, entries: [], requestCount: 1, providers: [], warnings: [] };
    expect(isNoProviderConfigured({ ...base, warnings: ['No search provider is enabled'] })).toBe(
      true,
    );
    expect(isNoProviderConfigured({ ...base, warnings: [] })).toBe(false);
    expect(
      isNoProviderConfigured({
        ...base,
        entries: [{ url: 'https://a.test' }],
        warnings: ['No search provider is enabled'],
      }),
    ).toBe(false);
  });
});

describe('research gateway fetch batch and run', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches pages in parallel (bounded), keeps input order and falls back per page', async () => {
    let inFlight = 0;
    let peak = 0;
    mockedHttp.mockImplementation(async ({ body }) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;
      const url = (body as { url: string }).url;
      return url.endsWith('/bad')
        ? { ok: false, status: 500, data: {} }
        : { ok: true, status: 200, data: { url, content: `text of ${url}` } };
    });
    const urls = Array.from(
      { length: 9 },
      (_, i) => `https://p.test/${i === 4 ? 'bad' : String(i)}`,
    );
    const pages = await gatewayFetchPages('Bearer t', urls);
    expect(pages.map((page) => page.url)).toEqual(urls);
    expect(pages[4]?.ok).toBe(false);
    expect(pages[4]?.failure).toBe(ResearchGatewayFailure.HTTP_ERROR);
    expect(pages[0]?.content).toBe('text of https://p.test/0');
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(RESEARCH_GATEWAY_FETCH_CONCURRENCY);
  });

  it('gives every page the remaining fetch-phase budget, never more than the phase', async () => {
    mockedHttp.mockResolvedValue({ ok: true, status: 200, data: { content: 'x' } });
    await gatewayFetchPages('Bearer t', ['https://a.test', 'https://b.test']);
    for (const [call] of mockedHttp.mock.calls) {
      expect(call.timeoutMs).toBeLessThanOrEqual(RESEARCH_GATEWAY_FETCH_TIMEOUT_MS);
      expect(call.timeoutMs).toBeGreaterThan(RESEARCH_SERVICE_FETCH_PHASE_BOUND_MS);
    }
  });

  it('gatewayRun passes the request to research-service unchanged', async () => {
    mockedRun.mockResolvedValue({ id: 'r', status: 'COMPLETED' } as never);
    const request = {
      userToken: 't',
      userId: 'u1',
      intent: 'q',
      workflow: ResearchWorkflow.SEARCH_THEN_FETCH,
    };
    await gatewayRun(request);
    expect(mockedRun).toHaveBeenCalledWith('http://research.test', request);
  });
});
