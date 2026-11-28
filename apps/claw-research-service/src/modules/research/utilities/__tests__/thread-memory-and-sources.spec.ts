import { describe, expect, it } from 'vitest';

import { RESEARCH_SOURCE_EXCERPT_MAX_CHARS } from '../../../../common/constants/research-engine.constants';
import { ResearchSourceDiscovery } from '../../../../common/enums/research-source-discovery.enum';
import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import { contentHashOf, normaliseForHash } from '../../../../common/utilities/content-hash.utility';
import { sha256Hex } from '../../../../common/utilities/hash.utility';
import {
  discoveryOf,
  persistedFetchStatus,
  toDateOrNull,
  toResearchSourceRows,
} from '../research-source-rows.utility';
import {
  buildThreadMemory,
  overlapTokensOf,
  pickThreadExtras,
  reusedEvidenceFrom,
  sharedTokenCount,
  significantTokens,
} from '../thread-memory.utility';
import type { ResearchSource } from '../../../../generated/prisma';
import type { EvidenceItem } from '../../types/evidence-bundle.types';

const NOW = new Date('2026-11-28T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

const sourceRow = (overrides: Partial<ResearchSource> = {}): ResearchSource => ({
  id: 'src-1',
  runId: 'run-old',
  userId: 'u1',
  threadId: 'thread-1',
  url: 'https://a.example/page',
  canonicalKey: 'a.example/page',
  host: 'a.example',
  title: 'Page',
  excerpt: 'stored excerpt',
  contentHash: 'h',
  language: null,
  query: null,
  round: 1,
  discoveredVia: 'SEARCH',
  providerKind: null,
  fetchStatus: 'OK',
  publishedAt: null,
  retrievedAt: new Date(NOW.getTime() - HOUR),
  score: 0.7,
  createdAt: new Date(NOW.getTime() - HOUR),
  ...overrides,
});

const item = (overrides: Partial<EvidenceItem> = {}): EvidenceItem => ({
  id: 'i1',
  title: 'T',
  url: 'https://a.example/page',
  snippet: 'Body Text',
  source: 'fetch',
  providerKind: null,
  publishedAt: null,
  fetchedAt: null,
  confidence: 0.8,
  ...overrides,
});

describe('content hash', () => {
  it('normalises case and whitespace before hashing', () => {
    expect(normaliseForHash('  Hello \n\t World ')).toBe('hello world');
    expect(contentHashOf('Hello   World')).toBe(contentHashOf('hello world'));
    expect(contentHashOf('hello world')).toBe(sha256Hex('hello world'));
    expect(contentHashOf('hello world')).toMatch(/^[0-9a-f]{64}$/u);
    expect(contentHashOf('hello world')).not.toBe(contentHashOf('hello there'));
  });
});

describe('significant tokens', () => {
  it('is Unicode-aware, lower-cases, drops short tokens and stopwords', () => {
    const tokens = significantTokens('What is the GDP of Ägypten? مصر الاقتصاد 2026 हिन्दी AI');

    expect(tokens).toEqual(new Set(['gdp', 'ägypten', 'مصر', 'الاقتصاد', '2026', 'हिन्दी']));
  });

  it('counts distinct shared tokens', () => {
    expect(sharedTokenCount(new Set(['a1', 'b2', 'c3']), new Set(['b2', 'c3', 'd4']))).toBe(2);
    expect(sharedTokenCount(new Set(), new Set(['x']))).toBe(0);
  });

  it('judges a stored row by title, query and the start of the excerpt', () => {
    const tokens = overlapTokensOf(
      sourceRow({ title: 'Tesla quarterly', query: 'tesla deliveries', excerpt: 'robotaxi' }),
    );

    expect(tokens).toEqual(new Set(['tesla', 'quarterly', 'deliveries', 'robotaxi']));
  });
});

describe('buildThreadMemory', () => {
  it('indexes read pages in the window, newest first; hits and stale reads are not reusable', () => {
    const memory = buildThreadMemory(
      [
        sourceRow({ id: 'new', runId: 'run-new' }),
        sourceRow({ id: 'older', runId: 'run-older' }),
        sourceRow({ id: 'hit', canonicalKey: 'b.example/x', fetchStatus: null }),
        sourceRow({
          id: 'stale',
          canonicalKey: 'c.example/y',
          retrievedAt: new Date(NOW.getTime() - 25 * HOUR),
        }),
        sourceRow({ id: 'thin', canonicalKey: 'd.example/z', fetchStatus: 'THIN' }),
      ],
      NOW,
    );

    expect([...memory.readByKey.keys()]).toEqual(['a.example/page']);
    expect(memory.readByKey.get('a.example/page')?.runId).toBe('run-new');
    expect(memory.rows.map((row) => row.id)).toEqual(['new', 'hit', 'stale', 'thin']);
  });

  it('prefers a read page over a bare hit for the same URL', () => {
    const memory = buildThreadMemory(
      [sourceRow({ id: 'hit', fetchStatus: null }), sourceRow({ id: 'page' })],
      NOW,
    );

    expect(memory.rows.map((row) => row.id)).toEqual(['page']);
  });
});

describe('pickThreadExtras', () => {
  const memory = buildThreadMemory(
    [
      sourceRow({ id: 'two', canonicalKey: 'k2', title: 'Tesla deliveries record', score: 0.4 }),
      sourceRow({ id: 'one', canonicalKey: 'k1', title: 'Tesla stock' }),
      sourceRow({
        id: 'three',
        canonicalKey: 'k3',
        title: 'Tesla deliveries record quarter',
        score: 0.1,
      }),
      sourceRow({ id: 'present', canonicalKey: 'k4', title: 'Tesla deliveries record quarter' }),
      sourceRow({ id: 'two-b', canonicalKey: 'k5', title: 'Tesla deliveries', score: 0.9 }),
    ],
    NOW,
  );

  it('needs at least 2 shared significant tokens, skips present URLs, best overlap first', () => {
    const picked = pickThreadExtras(
      memory,
      'Tesla deliveries record this quarter?',
      new Set(['k4']),
      3,
    );

    expect(picked.map((row) => row.id)).toEqual(['three', 'two', 'two-b']);
  });

  it('caps at max and ties break on stored score', () => {
    const picked = pickThreadExtras(memory, 'tesla deliveries', new Set(), 2);

    expect(picked.map((row) => row.id)).toEqual(['two-b', 'present']);
  });

  it('one shared token is not enough; an intent with < 2 significant tokens picks nothing', () => {
    expect(pickThreadExtras(memory, 'tesla weather', new Set(), 3)).toEqual([]);
    expect(pickThreadExtras(memory, 'what is the tesla', new Set(), 3)).toEqual([]);
    expect(pickThreadExtras(memory, 'tesla deliveries', new Set(), 0)).toEqual([]);
  });
});

describe('reusedEvidenceFrom', () => {
  it('is an item with no fetch provenance and the original run id', () => {
    const reused = reusedEvidenceFrom(sourceRow({ providerKind: 'EXA' }), 0.5, 'thread');

    expect(reused).toMatchObject({
      url: 'https://a.example/page',
      snippet: 'stored excerpt',
      source: 'fetch',
      providerKind: 'EXA',
      confidence: 0.5,
      reusedFromRunId: 'run-old',
      fetchedAt: new Date(NOW.getTime() - HOUR).toISOString(),
    });
    expect(reused).not.toHaveProperty('fetch');
    expect(reused).not.toHaveProperty('fetchStatus');
    expect(reusedEvidenceFrom(sourceRow({ fetchStatus: null }), 0.5, 'thread').source).toBe(
      'search',
    );
  });
});

describe('research_sources rows', () => {
  const base = {
    runId: 'run-1',
    userId: 'u1',
    threadId: 'thread-1',
    round: 2,
    workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
    directKeys: new Set(['user.example/pasted']),
    now: NOW,
  };

  it('maps every item, caps the excerpt and always sets a sha256 hash', () => {
    const long = 'x'.repeat(RESEARCH_SOURCE_EXCERPT_MAX_CHARS + 50);
    const [row] = toResearchSourceRows({
      ...base,
      items: [item({ snippet: long, query: 'q1', publishedAt: '2026-01-02T00:00:00.000Z' })],
    });

    expect(row).toMatchObject({
      runId: 'run-1',
      userId: 'u1',
      threadId: 'thread-1',
      canonicalKey: 'a.example/page',
      host: 'a.example',
      query: 'q1',
      round: 2,
      discoveredVia: ResearchSourceDiscovery.SEARCH,
      fetchStatus: 'OK',
      publishedAt: new Date('2026-01-02T00:00:00.000Z'),
      retrievedAt: NOW,
      score: 0.8,
      language: null,
    });
    expect(row?.excerpt).toHaveLength(RESEARCH_SOURCE_EXCERPT_MAX_CHARS);
    expect(row?.contentHash).toBe(contentHashOf(long));
  });

  it('keeps an item hash and a reused item original read time', () => {
    const [row] = toResearchSourceRows({
      ...base,
      items: [
        item({ contentHash: 'abc', reusedFromRunId: 'old', fetchedAt: '2026-11-28T01:00:00.000Z' }),
      ],
    });

    expect(row?.contentHash).toBe('abc');
    expect(row?.retrievedAt).toEqual(new Date('2026-11-28T01:00:00.000Z'));
    expect(row?.discoveredVia).toBe(ResearchSourceDiscovery.THREAD_MEMORY);
  });

  it('labels discovery: memory, crawl, pasted page, search', () => {
    const context = {
      workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
      directKeys: base.directKeys,
    };
    expect(discoveryOf(item({ reusedFromRunId: 'r' }), context)).toBe('THREAD_MEMORY');
    expect(discoveryOf(item(), { ...context, workflow: ResearchWorkflowKind.SITE_CRAWL })).toBe(
      'CRAWL',
    );
    expect(discoveryOf(item({ url: 'https://user.example/pasted' }), context)).toBe('DIRECT');
    expect(
      discoveryOf(item({ url: 'https://user.example/pasted', source: 'search' }), context),
    ).toBe('SEARCH');
    expect(discoveryOf(item(), context)).toBe('SEARCH');
  });

  it('stores OK only for a read page', () => {
    expect(persistedFetchStatus(item({ source: 'search', fetchStatus: 'OK' }))).toBeNull();
    expect(
      persistedFetchStatus(item({ fetch: { strategy: 'HTTP_PLAIN', attempts: [], thin: true } })),
    ).toBe('THIN');
    expect(persistedFetchStatus(item({ fetchStatus: 'OK' }))).toBe('OK');
    expect(persistedFetchStatus(item({ source: 'scrape' }))).toBe('OK');
  });

  it('parses dates defensively', () => {
    expect(toDateOrNull(null)).toBeNull();
    expect(toDateOrNull('not a date')).toBeNull();
    expect(toDateOrNull('2026-01-01T00:00:00.000Z')).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });
});
