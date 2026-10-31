import { describe, expect, it, vi } from 'vitest';

import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { ResearchEnricherManager } from '../managers/research-enricher.manager';
import type * as GatewayModule from '../utilities/research-gateway.utility';
import type {
  ResearchGatewayPage,
  ResearchGatewaySearchOutcome,
} from '../types/research-gateway.types';
import { gatewayFetchPages, gatewaySearch } from '../utilities/research-gateway.utility';

// ADR-212: the answering model starts only after the gateway has returned, so every
// provider's results (and the fetched pages) are in the prompt together. The enricher is
// the one door for Compare and all nine orchestration managers, so a deferred gateway here
// stands in for "research still running": the call a surface makes before it starts the
// model must not resolve while it is pending.

vi.mock('../utilities/research-gateway.utility', async (importOriginal) => ({
  ...(await importOriginal<typeof GatewayModule>()),
  gatewaySearch: vi.fn(),
  gatewayFetchPages: vi.fn(),
}));

const mockedSearch = vi.mocked(gatewaySearch);
const mockedFetch = vi.mocked(gatewayFetchPages);

const found = (): ResearchGatewaySearchOutcome => ({
  ok: true,
  entries: [{ url: 'https://a.test', title: 'A', snippet: 'a' }],
  requestCount: 1,
  providers: [{ name: 'Brave', ok: true }],
  warnings: [],
});

const tick = async (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 20));

describe('a surface starts its model only after research has resolved', () => {
  const emit = vi.fn();
  const enricher = new ResearchEnricherManager({ emitResearchProgress: emit } as never);

  it('enrich waits for the search, then the fetch batch, then returns', async () => {
    let releaseSearch!: (value: ResearchGatewaySearchOutcome) => void;
    let releaseFetch!: (value: ResearchGatewayPage[]) => void;
    mockedSearch.mockReturnValue(
      new Promise((resolve) => {
        releaseSearch = resolve;
      }),
    );
    mockedFetch.mockReturnValue(
      new Promise((resolve) => {
        releaseFetch = resolve;
      }),
    );
    const order: string[] = [];
    const turn = enricher
      .enrich({ mode: ResearchMode.SEARCH_FETCH, query: 'q', userAuthHeader: 'Bearer t' })
      .then(() => order.push('model-would-start'));

    await tick();
    expect(order).toEqual([]);
    expect(mockedFetch).not.toHaveBeenCalled();

    releaseSearch(found());
    await tick();
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(order).toEqual([]);

    releaseFetch([{ url: 'https://a.test', ok: true, content: 'page text' }]);
    await turn;
    expect(order).toEqual(['model-would-start']);
  });

  it('enrichForOrchestration (Consensus, Escalation, Repair, Decompose, Best-of-N, Verify, Pipeline, Cost-Ensemble, Role Pack) waits too', async () => {
    let releaseSearch!: (value: ResearchGatewaySearchOutcome) => void;
    mockedSearch.mockReturnValue(
      new Promise((resolve) => {
        releaseSearch = resolve;
      }),
    );
    mockedFetch.mockResolvedValue([{ url: 'https://a.test', ok: true, content: 'page text' }]);
    let modelStarted = false;
    const turn = enricher
      .enrichForOrchestration({
        threadId: 't1',
        mode: ResearchMode.SEARCH_FETCH,
        query: 'q',
        userToken: 'tok',
      })
      .then((result) => {
        modelStarted = true;
        return result;
      });
    await tick();
    expect(modelStarted).toBe(false);
    releaseSearch(found());
    const result = await turn;
    expect(modelStarted).toBe(true);
    expect(result.systemPrompt).toContain('page text');
  });

  it('a slow search that ends in a timeout still ends the wait, with a notice and no throw', async () => {
    mockedSearch.mockResolvedValue({
      ok: false,
      failure: 'TIMEOUT' as never,
      entries: [],
      requestCount: 1,
      providers: [],
      warnings: [],
    });
    const result = await enricher.enrichForOrchestration({
      threadId: 't1',
      mode: ResearchMode.SEARCH,
      query: 'q',
      userToken: 'tok',
    });
    expect(result.transcript?.warnings).toContain('research.searchTimedOut');
    expect(result.systemPrompt).toContain('returned no usable results');
  });
});
