// Universal-research PR1 — slice 2 coverage for the ResearchEnricherManager
// from a different angle than managers/__tests__/research-enricher.manager.spec.ts:
// instead of asserting raw SSE-stage ordering, this file pins down the public
// CONTRACT used by every chat flow (parallel + the 8 orchestration entry
// points + normal chat) — i.e. that:
//
//   * Each ResearchMode value (NONE / SEARCH / SEARCH_FETCH / SEARCH_EXTRACT)
//     calls the right research-service endpoint with the right body.
//   * Each mode populates the right shape on the resulting ResearchEnrichResult.
//     SEARCH yields titles+snippets only; SEARCH_FETCH adds page contents;
//     SEARCH_EXTRACT adds extracted main-article text using the larger excerpt
//     budget (RESEARCH_ENRICHER_EXTRACT_BODY_MAX_CHARS=2_500).
//   * Per-source body truncation respects the constants — both the fetch budget
//     (2_000 chars) and the extract budget (2_500 chars).
//   * A research-service 5xx never throws — the manager swallows it, returns
//     the empty-results block, and surfaces no sources. This is the
//     transcript.warnings + "RESEARCH_FAILED" contract: from the manager's
//     perspective the run survives; from the chat-messages.service
//     runEnricherTranscript wrapper's perspective it is reported as a warning
//     (verified separately in research-mode-enum-migration.spec.ts).
//   * A thrown exception from inside the sources-enrichment pipeline emits
//     RESEARCH_FAILED on the SSE bus AND propagates the error to the caller.
//   * The metadata.researchTranscript shape (built by chat-messages.service +
//     parallel-execution.manager) is sourced verbatim from this manager's
//     output, so the FE "Used N web sources" badge round-trips for every mode.

import { AiStreamStage } from '../../../common/enums';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import {
  RESEARCH_ENRICHER_EMPTY_RESULTS_BLOCK,
  RESEARCH_ENRICHER_EXTRACT_BODY_MAX_CHARS,
  RESEARCH_ENRICHER_FETCH_BODY_MAX_CHARS,
} from '../constants/research-enricher.constants';
import { ResearchEnricherManager } from '../managers/research-enricher.manager';
import { type ChatStreamService } from '../services/chat-stream.service';
import type { ResearchEnrichResult, ResearchSource } from '../types/research-enricher.types';
import type {
  ResearchTranscript,
  ResearchTranscriptSource,
} from '../types/research-transcript.types';

jest.mock('../../../common/utilities', () => ({
  httpRequest: jest.fn(),
}));
jest.mock('../../../app/config/app.config');

const { httpRequest } = jest.requireMock('../../../common/utilities') as {
  httpRequest: jest.Mock;
};
const { AppConfig } = jest.requireMock('../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};

const RESEARCH_URL = 'http://research-service:4016';
const SEARCH_URL = `${RESEARCH_URL}/api/v1/research/search`;
const FETCH_URL = `${RESEARCH_URL}/api/v1/research/fetch`;
const AUTH_HEADER = 'Bearer abc.def.ghi';

type StreamStub = {
  emitResearchProgress: jest.Mock;
  service: ChatStreamService;
};

function buildStreamStub(): StreamStub {
  const emitResearchProgress = jest.fn();
  const service = { emitResearchProgress } as unknown as ChatStreamService;
  return { emitResearchProgress, service };
}

// Mirrors parallel-execution.manager.buildTranscriptFromEnricher so we can
// assert the shape the FE actually sees. Keeping it local (instead of
// importing the private manager method) keeps this test focused on the
// contract, not the implementation.
function buildTranscriptFromEnricher(
  mode: ResearchMode,
  query: string,
  result: ResearchEnrichResult,
  latencyMs: number,
): ResearchTranscript {
  const sources: ResearchTranscriptSource[] = result.sources.map((source) => ({
    title: source.title,
    url: source.url,
    ...(source.snippet === undefined ? {} : { snippet: source.snippet }),
    ...(source.extracted === undefined ? {} : { extracted: source.extracted }),
  }));
  return {
    mode,
    query,
    sources,
    latencyMs,
    warnings: [],
    searchRequestCount: 1,
    fetchRequestCount: mode === ResearchMode.SEARCH ? 0 : sources.length,
  };
}

function searchPayload(results: Array<Partial<ResearchSource> & { url: string }>): {
  ok: true;
  status: 200;
  data: { runId: string; providerKind: string; results: typeof results };
} {
  return {
    ok: true,
    status: 200,
    data: { runId: 'run-test', providerKind: 'tavily', results },
  };
}

describe('ResearchEnricherManager (chat-messages contract)', () => {
  let manager: ResearchEnricherManager;
  let stream: StreamStub;

  beforeEach(() => {
    jest.clearAllMocks();
    AppConfig.get.mockReturnValue({ RESEARCH_SERVICE_URL: RESEARCH_URL });
    stream = buildStreamStub();
    manager = new ResearchEnricherManager(stream.service);
  });

  // ─── Case 1: NONE skips entirely ─────────────────────────────────────────
  it('NONE: skips entirely — no HTTP call, no SSE frame, no sources', async () => {
    const result = await manager.enrich({
      mode: ResearchMode.NONE,
      query: 'will not be used',
      userAuthHeader: AUTH_HEADER,
      threadId: 'thread-none',
    });

    expect(result).toEqual({
      evidence: '',
      sources: [],
      mode: ResearchMode.NONE,
      searchRequestCount: 0,
      fetchRequestCount: 0,
    });
    expect(httpRequest).not.toHaveBeenCalled();
    expect(stream.emitResearchProgress).not.toHaveBeenCalled();
  });

  // ─── Case 2: SEARCH returns titles + snippets ────────────────────────────
  it('SEARCH: returns titles + snippets, never fetches, uses /research/search', async () => {
    httpRequest.mockResolvedValueOnce(
      searchPayload([
        {
          title: 'TypeScript 5.9 release notes',
          url: 'https://typescriptlang.org/blog/5-9',
          snippet: 'TypeScript 5.9 brings improved inference.',
        },
        {
          title: 'TypeScript roadmap',
          url: 'https://github.com/microsoft/TypeScript/roadmap',
          snippet: 'Roadmap snapshot.',
        },
      ]),
    );

    const result = await manager.enrich({
      mode: ResearchMode.SEARCH,
      query: 'latest typescript release',
      userAuthHeader: AUTH_HEADER,
    });

    expect(httpRequest).toHaveBeenCalledTimes(1);
    const [searchCall] = httpRequest.mock.calls;
    expect(searchCall[0]).toEqual(
      expect.objectContaining({
        url: SEARCH_URL,
        method: 'POST',
        headers: { Authorization: AUTH_HEADER },
        body: { query: 'latest typescript release', maxResults: 5 },
      }),
    );

    expect(result.mode).toBe(ResearchMode.SEARCH);
    expect(result.searchRequestCount).toBe(1);
    expect(result.fetchRequestCount).toBe(0);
    expect(result.sources).toHaveLength(2);
    expect(result.searchRequestCount).toBe(1);
    expect(result.fetchRequestCount).toBe(0);
    for (const source of result.sources) {
      expect(source.title.length).toBeGreaterThan(0);
      expect(source.url.length).toBeGreaterThan(0);
      expect(source.snippet?.length ?? 0).toBeGreaterThan(0);
      expect(source.extracted).toBeUndefined();
    }
    expect(result.evidence).toContain('## Web research evidence (mode: SEARCH');
    expect(result.evidence).toContain(
      'TypeScript 5.9 release notes — https://typescriptlang.org/blog/5-9',
    );
  });

  // ─── Case 3: SEARCH_FETCH adds page contents ─────────────────────────────
  it('SEARCH_FETCH: adds page contents from /research/fetch (one POST per URL)', async () => {
    httpRequest.mockResolvedValueOnce(
      searchPayload([
        { title: 'Doc A', url: 'https://example.com/a', snippet: 'snippet-a' },
        { title: 'Doc B', url: 'https://example.com/b', snippet: 'snippet-b' },
      ]),
    );
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { url: 'https://example.com/a', content: 'Full body A.', httpStatus: 200 },
    });
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { url: 'https://example.com/b', content: 'Full body B.', httpStatus: 200 },
    });

    const result = await manager.enrich({
      mode: ResearchMode.SEARCH_FETCH,
      query: 'page contents test',
      userAuthHeader: AUTH_HEADER,
      topResults: 2,
      topFetch: 2,
    });

    expect(httpRequest).toHaveBeenCalledTimes(3);
    expect(httpRequest.mock.calls[0][0].url).toBe(SEARCH_URL);
    expect(httpRequest.mock.calls[1][0].url).toBe(FETCH_URL);
    expect(httpRequest.mock.calls[2][0].url).toBe(FETCH_URL);

    expect(result.sources).toHaveLength(2);
    expect(result.searchRequestCount).toBe(1);
    expect(result.fetchRequestCount).toBe(2);
    const [a, b] = result.sources;
    if (!a || !b) {
      throw new Error('expected 2 sources');
    }
    expect(a.extracted).toBe('Full body A.');
    expect(b.extracted).toBe('Full body B.');
    expect(result.evidence).toContain('Full body A.');
    expect(result.evidence).toContain('Full body B.');
  });

  // ─── Case 4: SEARCH_EXTRACT routes through fetch with larger excerpt ─────
  it('SEARCH_EXTRACT: routes through /research/fetch with the larger 2_500-char extract budget', async () => {
    const longContent = 'Y'.repeat(3_500);
    httpRequest.mockResolvedValueOnce(
      searchPayload([{ title: 'RFC 1234', url: 'https://rfc/1234', snippet: 'rfc' }]),
    );
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { url: 'https://rfc/1234', content: longContent, httpStatus: 200 },
    });

    const result = await manager.enrich({
      mode: ResearchMode.SEARCH_EXTRACT,
      query: 'rfc lookup',
      userAuthHeader: AUTH_HEADER,
      topResults: 1,
      topFetch: 1,
    });

    expect(httpRequest).toHaveBeenCalledTimes(2);
    expect(httpRequest.mock.calls[1][0].url).toBe(FETCH_URL);
    const [only] = result.sources;
    if (!only) {
      throw new Error('expected one source');
    }
    expect(only.extracted?.length).toBe(RESEARCH_ENRICHER_EXTRACT_BODY_MAX_CHARS);
    expect(RESEARCH_ENRICHER_EXTRACT_BODY_MAX_CHARS).toBeGreaterThan(
      RESEARCH_ENRICHER_FETCH_BODY_MAX_CHARS,
    );
    expect(result.evidence).toContain('## Web research evidence (mode: SEARCH_EXTRACT');
  });

  // ─── Case 5: research-service 5xx → empty-results block + RESEARCH_FAILED never thrown
  it('5xx: research-service search returns 500 — empty-results block, no throw, no thrown SSE failure', async () => {
    httpRequest.mockResolvedValueOnce({ ok: false, status: 500, data: { error: 'boom' } });
    const result = await manager.enrich({
      mode: ResearchMode.SEARCH,
      query: 'who is the current ceo of x',
      userAuthHeader: AUTH_HEADER,
      threadId: 'thread-5xx',
    });

    expect(result.evidence).toBe(RESEARCH_ENRICHER_EMPTY_RESULTS_BLOCK);
    expect(result.sources).toEqual([]);
    expect(result.mode).toBe(ResearchMode.SEARCH);

    // RESEARCH_FAILED is reserved for the catch-path (uncaught throw). A 5xx
    // is recoverable: we surface RESEARCH_COMPLETED with sourcesCount=0 and
    // let the caller record a transcript.warnings entry. This contract is
    // what makes runEnricherTranscript safe to call from every chat flow.
    const stages = stream.emitResearchProgress.mock.calls.map(
      (call: [string, { stage: AiStreamStage }]) => call[1].stage,
    );
    expect(stages).not.toContain(AiStreamStage.RESEARCH_FAILED);
    expect(stages).toContain(AiStreamStage.RESEARCH_COMPLETED);

    const transcript = buildTranscriptFromEnricher(
      ResearchMode.SEARCH,
      'who is the current ceo of x',
      result,
      10,
    );
    expect(transcript.sources).toEqual([]);
    expect(transcript.warnings).toEqual([]);
  });

  // ─── Case 6: throw inside enrich → RESEARCH_FAILED + bubbles up ──────────
  it('uncaught throw inside enrichSourcesByMode: emits RESEARCH_FAILED and rethrows so transcript.warnings can be populated upstream', async () => {
    httpRequest.mockResolvedValueOnce(
      searchPayload([{ title: 'A', url: 'https://a/1', snippet: 's' }]),
    );
    const inner = manager as unknown as {
      enrichSourcesByMode: (...args: unknown[]) => Promise<unknown>;
    };
    const original = inner.enrichSourcesByMode;
    inner.enrichSourcesByMode = jest
      .fn()
      .mockRejectedValueOnce(new Error('downstream-network-collapse'));

    await expect(
      manager.enrich({
        mode: ResearchMode.SEARCH_FETCH,
        query: 'q',
        userAuthHeader: AUTH_HEADER,
        threadId: 'thread-fail-throw',
        topResults: 1,
        topFetch: 1,
      }),
    ).rejects.toThrow('downstream-network-collapse');

    const stages = stream.emitResearchProgress.mock.calls.map(
      (call: [string, { stage: AiStreamStage }]) => call[1].stage,
    );
    expect(stages).toContain(AiStreamStage.RESEARCH_FAILED);
    const failedPayload = stream.emitResearchProgress.mock.calls.find(
      (call: [string, { stage: AiStreamStage }]) => call[1].stage === AiStreamStage.RESEARCH_FAILED,
    )?.[1] as { details: { error?: string } };
    expect(failedPayload.details.error).toBe('downstream-network-collapse');

    // Restore so a later test in this describe block can re-enter freely.
    inner.enrichSourcesByMode = original;
  });

  // ─── Case 7: per-source char budget truncation ───────────────────────────
  it('SEARCH_FETCH: per-source body is truncated at RESEARCH_ENRICHER_FETCH_BODY_MAX_CHARS (2_000)', async () => {
    const oversize = 'Z'.repeat(5_000);
    httpRequest.mockResolvedValueOnce(
      searchPayload([{ title: 'Long', url: 'https://long/', snippet: 's' }]),
    );
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { url: 'https://long/', content: oversize, httpStatus: 200 },
    });

    const result = await manager.enrich({
      mode: ResearchMode.SEARCH_FETCH,
      query: 'truncate test',
      userAuthHeader: AUTH_HEADER,
      topResults: 1,
      topFetch: 1,
    });

    const [only] = result.sources;
    if (!only) {
      throw new Error('expected one source');
    }
    expect(only.extracted?.length).toBe(RESEARCH_ENRICHER_FETCH_BODY_MAX_CHARS);
    expect(only.extracted?.length).not.toBe(RESEARCH_ENRICHER_EXTRACT_BODY_MAX_CHARS);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  // ─── Case 8: metadata.researchTranscript shape ───────────────────────────
  it('researchTranscript shape: mode + query + sources[] + latencyMs + warnings[] — sources mirror the enricher output', async () => {
    httpRequest.mockResolvedValueOnce(
      searchPayload([
        { title: 'S1', url: 'https://s/1', snippet: 's-1' },
        { title: 'S2', url: 'https://s/2', snippet: 's-2' },
      ]),
    );
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { url: 'https://s/1', content: 'extracted-1', httpStatus: 200 },
    });
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { url: 'https://s/2', content: 'extracted-2', httpStatus: 200 },
    });

    const startedAt = Date.now();
    const result = await manager.enrich({
      mode: ResearchMode.SEARCH_FETCH,
      query: 'transcript shape test',
      userAuthHeader: AUTH_HEADER,
      topResults: 2,
      topFetch: 2,
    });

    const transcript = buildTranscriptFromEnricher(
      ResearchMode.SEARCH_FETCH,
      'transcript shape test',
      result,
      Math.max(1, Date.now() - startedAt),
    );

    expect(transcript.mode).toBe(ResearchMode.SEARCH_FETCH);
    expect(transcript.query).toBe('transcript shape test');
    expect(transcript.warnings).toEqual([]);
    expect(transcript.latencyMs).toBeGreaterThanOrEqual(1);
    expect(transcript.sources).toHaveLength(2);
    expect(transcript.sources[0]).toEqual(
      expect.objectContaining({
        title: 'S1',
        url: 'https://s/1',
        snippet: 's-1',
        extracted: 'extracted-1',
      }),
    );
    expect(transcript.sources[1]).toEqual(
      expect.objectContaining({
        title: 'S2',
        url: 'https://s/2',
        snippet: 's-2',
        extracted: 'extracted-2',
      }),
    );
    // The serialized transcript must be JSON-safe so it can round-trip
    // through the ChatMessage.metadata JSON column on the FE re-render.
    const roundTripped = JSON.parse(JSON.stringify(transcript)) as ResearchTranscript;
    expect(roundTripped).toEqual(transcript);
  });

  // ─── Bonus case: fetch-side error falls back to snippet without thrown ───
  it("SEARCH_FETCH partial-failure: when one URL fetch throws, falls back to that source's snippet — never throws", async () => {
    httpRequest.mockResolvedValueOnce(
      searchPayload([
        { title: 'OK', url: 'https://ok/1', snippet: 'ok-snippet' },
        { title: 'BAD', url: 'https://bad/1', snippet: 'bad-snippet' },
      ]),
    );
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { url: 'https://ok/1', content: 'ok body', httpStatus: 200 },
    });
    httpRequest.mockRejectedValueOnce(new Error('per-url-fetch-failed'));

    const result = await manager.enrich({
      mode: ResearchMode.SEARCH_FETCH,
      query: 'partial fail',
      userAuthHeader: AUTH_HEADER,
      topResults: 2,
      topFetch: 2,
    });

    expect(result.sources).toHaveLength(2);
    const [ok, bad] = result.sources;
    if (!ok || !bad) {
      throw new Error('expected 2 sources');
    }
    expect(ok.extracted).toBe('ok body');
    expect(bad.extracted).toBeUndefined();
    expect(bad.snippet).toBe('bad-snippet');
  });
});
