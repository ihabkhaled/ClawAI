import { describe, expect, it } from 'vitest';

import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import { contentHashOf } from '../../../../common/utilities/content-hash.utility';
import { sha1Short } from '../../../../common/utilities/hash.utility';
import { ResearchRunState } from '../research-run-state.utility';
import type { ResearchSource } from '../../../../generated/prisma';
import type { ExecuteResearchDto } from '../../dto/execute-research.dto';
import type { EvidenceItem } from '../../types/evidence-bundle.types';

const NOW = new Date('2026-11-28T12:00:00.000Z');
const legacy: ExecuteResearchDto = {
  intent: 'tesla deliveries',
  workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
};

const item = (overrides: Partial<EvidenceItem> = {}): EvidenceItem => ({
  id: 'i',
  title: 'T',
  url: 'https://a.example/p',
  snippet: 'Body',
  source: 'search',
  providerKind: null,
  publishedAt: null,
  fetchedAt: null,
  confidence: 0.6,
  ...overrides,
});

const row = (overrides: Partial<ResearchSource> = {}): ResearchSource => ({
  id: 's',
  runId: 'run-old',
  userId: 'u1',
  threadId: 't1',
  url: 'https://a.example/p',
  canonicalKey: 'a.example/p',
  host: 'a.example',
  title: 'Stored title',
  excerpt: 'stored page text',
  contentHash: 'h',
  language: null,
  query: null,
  round: 1,
  discoveredVia: 'SEARCH',
  providerKind: null,
  fetchStatus: 'OK',
  publishedAt: null,
  retrievedAt: new Date(NOW.getTime() - 1000),
  score: 0.5,
  createdAt: new Date(NOW.getTime() - 1000),
  ...overrides,
});

describe('ResearchRunState — old-shape request is the identity of today', () => {
  const state = new ResearchRunState(legacy, 0);

  it('keeps today defaults', () => {
    expect(state.engine).toBe(false);
    expect(state.fetchTopN).toBe(8);
    expect(state.expansionCap).toBe(0);
    expect(state.round).toBe(1);
    expect(state.depth).toBeNull();
    expect(state.excludes('https://a.example/p')).toBe(false);
  });

  it('passes items through untouched and adds no bundle field', () => {
    const items = [item()];
    expect(state.keptHits(items, undefined)).toBe(items);
    expect(state.annotate(items)).toBe(items);
    expect(items[0]).not.toHaveProperty('round');
    expect(items[0]).not.toHaveProperty('contentHash');
    expect(state.bundleFields(items)).toEqual({});
    expect(state.maxItemsFor(items, 7)).toBe(7);
    expect(state.maxItemsFor(items, undefined)).toBeUndefined();
    expect(state.threadExtras('tesla deliveries', items)).toEqual([]);
  });

  it('dedupes bodies by exact sha1 like before, without stamping a hash', () => {
    const page = item({ snippet: 'Body' });
    expect(state.bodyKeyOf(page)).toBe(sha1Short('Body'));
    expect(page).not.toHaveProperty('contentHash');
  });
});

describe('ResearchRunState — engine request', () => {
  it('takes round, depth budget and exclusions from the request', () => {
    const state = new ResearchRunState(
      { ...legacy, depth: 3, round: 2, excludeUrls: ['https://www.a.example/p/?utm_source=x'] },
      0,
    );

    expect(state.engine).toBe(true);
    expect(state.fetchTopN).toBe(12);
    expect(state.expansionCap).toBe(5);
    expect(state.round).toBe(2);
    expect(state.excludes('http://a.example/p')).toBe(true);
    expect(state.excludes('https://a.example/other')).toBe(false);
  });

  it('depth absent in an engine request keeps today budget (8 pages, no expansion)', () => {
    const state = new ResearchRunState({ ...legacy, threadId: 't1' }, 0);
    expect(state.fetchTopN).toBe(8);
    expect(state.expansionCap).toBe(0);
  });

  it('stamps the normalised content hash as the body key', () => {
    const state = new ResearchRunState({ ...legacy, round: 1 }, 0);
    const page = item({ snippet: 'Same  TEXT' });
    expect(state.bodyKeyOf(page)).toBe(contentHashOf('same text'));
    expect(page.contentHash).toBe(contentHashOf('same text'));
  });

  it('annotates round and hash, keeps the best hits, keeps every item in the bundle', () => {
    const state = new ResearchRunState({ ...legacy, round: 3 }, 0);
    const hits = Array.from({ length: 30 }, (_, i) =>
      item({ url: `https://h${String(i)}.example` }),
    );
    expect(state.keptHits(hits, undefined)).toHaveLength(20);
    expect(state.keptHits(hits, 25)).toHaveLength(25);
    const annotated = state.annotate([item({ snippet: 'x' })]);
    expect(annotated[0]).toMatchObject({ round: 3, contentHash: contentHashOf('x') });
    expect(state.maxItemsFor(hits, undefined)).toBe(30);
    expect(state.maxItemsFor(hits, 40)).toBe(40);
  });

  it('serves a fetch target read in this thread from memory (a)', () => {
    const state = new ResearchRunState({ ...legacy, threadId: 't1' }, 0);
    state.attachMemory([row()], NOW);

    const reused = state.reusedPageFor(
      item({ url: 'https://a.example/p/', confidence: 0.9, query: 'q1' }),
    );

    expect(reused).toMatchObject({
      url: 'https://a.example/p',
      snippet: 'stored page text',
      title: 'Stored title',
      reusedFromRunId: 'run-old',
      confidence: expect.closeTo(0.95, 5),
      query: 'q1',
      source: 'fetch',
    });
    expect(reused).not.toHaveProperty('fetch');
    expect(state.reusedPageFor(item({ url: 'https://b.example/q' }))).toBeNull();
  });

  it('adds matching earlier sources not already present (b), excluded URLs never', () => {
    const state = new ResearchRunState(
      { ...legacy, threadId: 't1', excludeUrls: ['https://c.example/3'] },
      0,
    );
    state.attachMemory(
      [
        row({ url: 'https://a.example/p', canonicalKey: 'a.example/p', title: 'Tesla deliveries' }),
        row({
          url: 'https://b.example/2',
          canonicalKey: 'b.example/2',
          title: 'Tesla deliveries Q3',
        }),
        row({ url: 'https://c.example/3', canonicalKey: 'c.example/3', title: 'Tesla deliveries' }),
      ],
      NOW,
    );

    const extras = state.threadExtras('tesla deliveries', [item({ url: 'https://a.example/p' })]);

    expect(extras.map((extra) => extra.url)).toEqual(['https://b.example/2']);
    expect(extras[0]).toMatchObject({ confidence: 0.5, reusedFromRunId: 'run-old' });
  });

  it('builds stats and the log line from counters and items (no URLs, no query text)', () => {
    const state = new ResearchRunState(
      { ...legacy, depth: 2, round: 2, languages: ['de', 'en'] },
      1_000,
    );
    state.recordSearch({
      queries: ['secret query text', 'q2'],
      cachedSearches: 1,
      providersUsed: ['Ollama Web'],
      resultsFound: 9,
    });
    state.notePagesRead([
      item({ source: 'fetch' }),
      item({ source: 'fetch', fetch: { strategy: 'HTTP_PLAIN', attempts: [], thin: true } }),
      item({ source: 'search' }),
      item({ source: 'fetch', reusedFromRunId: 'r' }),
    ]);
    state.duplicatesRemoved = 1;
    const items = [item({ reusedFromRunId: 'r' }), item({ reusedFromRunId: 'r2' }), item()];

    expect(state.bundleFields(items)).toEqual({
      stats: {
        round: 2,
        queriesRun: 2,
        queries: ['secret query text', 'q2'],
        languages: ['de', 'en'],
        providersUsed: ['Ollama Web'],
        resultsFound: 9,
        pagesRead: 2,
        duplicatesRemoved: 1,
        reusedFromThread: 2,
        cachedSearches: 1,
      },
    });
    const line = state.logLine(items, 1_250);
    expect(line).toBe(
      'research.run: queries=2 cached=1 results=9 pages=2 dupes=1 reused=2 round=2 depth=2 platforms=0 ms=250',
    );
    expect(line).not.toContain('secret');
  });

  it('drops a hit whose page is in the run, in both modes (B3 fixed the old path)', () => {
    const hits = [item({ url: 'https://a.example/p' }), item({ url: 'https://b.example/q' })];
    const pages = [item({ url: 'https://www.a.example/p/', source: 'fetch' })];

    const engine = new ResearchRunState({ ...legacy, round: 1 }, 0);
    expect(engine.withoutReadHits(hits, pages).map((hit) => hit.url)).toEqual([
      'https://b.example/q',
    ]);
    expect(engine.withoutReadHits(hits, [])).toBe(hits);
    expect(
      new ResearchRunState(legacy, 0).withoutReadHits(hits, pages).map((hit) => hit.url),
    ).toEqual(['https://b.example/q']);
  });

  it('remembers pasted pages by canonical key', () => {
    const state = new ResearchRunState(legacy, 0);
    state.noteDirect([item({ url: 'https://www.user.example/x/' })]);
    expect([...state.directKeys]).toEqual(['user.example/x']);
  });
});
