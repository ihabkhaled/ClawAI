import {
  EVIDENCE_BUNDLE_MAX_ITEMS,
  EVIDENCE_GAP_MAX_NEW_ITEMS,
} from '../../constants/evidence-gap.constants';
import type { ResearchQueryResult } from '../../types/research-queries.types';
import {
  combineQueryResults,
  isPrimarySourceUrl,
  rankPrimarySourcesFirst,
} from '../research-bundle.utility';
import { mergeEvidenceBundles } from '../evidence-merge.utility';
import type { ResearchEvidence } from '../../../research/research.client';

const item = (id: string, url: string): Record<string, unknown> => ({ id, url, title: id });

const evidence = (items: Array<Record<string, unknown>>, run = 'r'): ResearchEvidence => ({
  researchRunId: run,
  bundle: { intent: run, items },
  sha256: 'x'.repeat(64),
  version: 1,
});

const answered = (query: string, items: Array<Record<string, unknown>>): ResearchQueryResult => ({
  query,
  evidence: evidence(items, query),
  itemCount: items.length,
  skippedForSpend: false,
});

const failed: ResearchQueryResult = {
  query: 'q',
  evidence: null,
  itemCount: 0,
  skippedForSpend: false,
  error: new Error('down'),
};

const itemsOf = (result: ResearchEvidence | null): Array<{ id: string; url: string }> =>
  (result?.bundle['items'] ?? []) as Array<{ id: string; url: string }>;

describe('primary-source hosts (ADR-195)', () => {
  it.each([
    'https://arxiv.org/abs/2310.13548',
    'https://ar5iv.labs.arxiv.org/html/2209.13085',
    'https://doi.org/10.1038/x',
    'https://aclanthology.org/2020.acl-main.1/',
    'https://openreview.net/forum?id=abc',
    'https://proceedings.mlr.press/v1/a.html',
    'https://www.nature.com/articles/x',
    'https://www.science.org/doi/10.1126/x',
    'https://ieeexplore.ieee.org/document/1',
    'https://dl.acm.org/doi/10.1145/1',
    'https://github.com/acme/agent',
  ])('%s is a primary source', (url) => {
    expect(isPrimarySourceUrl(url)).toBe(true);
  });

  it.each([
    'https://example.org/arxiv.org',
    'https://notarxiv.org/x',
    'https://arxiv.org.evil.example/x',
    'not a url',
  ])('%s is not', (url) => {
    expect(isPrimarySourceUrl(url)).toBe(false);
  });

  it('is false for a non-string', () => {
    expect(isPrimarySourceUrl(undefined)).toBe(false);
  });

  it('ranks primary hosts first and keeps each group in order', () => {
    const ranked = rankPrimarySourcesFirst([
      item('a', 'https://blog.example.com/a'),
      item('b', 'https://arxiv.org/abs/1'),
      item('c', 'https://news.example.com/c'),
      item('d', 'https://doi.org/10.1/d'),
    ]);

    expect(ranked.map((entry) => entry['id'])).toEqual(['b', 'd', 'a', 'c']);
  });
});

describe('combining the results of several queries (ADR-195)', () => {
  it('is null when no query returned a bundle', () => {
    expect(combineQueryResults([])).toBeNull();
    expect(combineQueryResults([failed, { ...failed, skippedForSpend: true }])).toBeNull();
  });

  it('returns a single answered query exactly as it came', () => {
    const only = answered('q', [item('a', 'https://example.org/a')]);

    expect(combineQueryResults([failed, only])).toBe(only.evidence);
  });

  it('takes one item per query in turn, so no query is starved, with primary sources first', () => {
    const combined = combineQueryResults([
      answered('q1', [
        item('a1', 'https://news.example.com/1'),
        item('a2', 'https://news.example.com/2'),
      ]),
      answered('q2', [
        item('b1', 'https://arxiv.org/abs/2'),
        item('b2', 'https://blog.example.com/2'),
      ]),
      answered('q3', [item('c1', 'https://doi.org/10.1/c')]),
    ]);

    expect(itemsOf(combined).map(({ id }) => id)).toEqual(['b1', 'c1', 'a1', 'a2', 'b2']);
  });

  it('keeps one copy of the same id or the same page written differently', () => {
    const combined = combineQueryResults([
      answered('q1', [item('a', 'https://arxiv.org/abs/1'), item('b', 'https://example.org/p')]),
      answered('q2', [
        item('a', 'https://arxiv.org/abs/1'),
        item('c', 'https://EXAMPLE.org/p/'),
        item('d', 'https://www.example.net/z'),
      ]),
    ]);

    expect(
      itemsOf(combined)
        .map(({ id }) => id)
        .sort(),
    ).toEqual(['a', 'b', 'd']);
  });

  it('drops urls that are not citable: loopback, private ranges, credentials, internal hosts', () => {
    const combined = combineQueryResults([
      answered('q1', [item('ok', 'https://example.org/a')]),
      answered('q2', [
        item('l', 'http://127.0.0.1/admin'),
        item('p', 'http://192.168.1.4/x'),
        item('m', 'http://169.254.169.254/latest'),
        item('i', 'https://db.internal/x'),
        item('u', 'https://user:pass@example.org/x'),
        item('s', 'ftp://example.org/x'),
        item('good', 'https://arxiv.org/abs/9'),
      ]),
    ]);

    expect(itemsOf(combined).map(({ id }) => id)).toEqual(['good', 'ok']);
  });

  it('never passes the bundle item cap, and the primary sources are the ones that stay', () => {
    const many = Array.from({ length: EVIDENCE_BUNDLE_MAX_ITEMS }, (_, i) =>
      item(`n${String(i)}`, `https://news${String(i)}.example.com/x`),
    );
    const combined = combineQueryResults([
      answered('q1', many),
      answered('q2', [
        item('p1', 'https://arxiv.org/abs/1'),
        item('p2', 'https://arxiv.org/abs/2'),
      ]),
    ]);

    expect(itemsOf(combined)).toHaveLength(EVIDENCE_BUNDLE_MAX_ITEMS);
    expect(
      itemsOf(combined)
        .slice(0, 2)
        .map(({ id }) => id),
    ).toEqual(['p1', 'p2']);
  });

  it('gives the combined bundle a hash of its own content and keeps the first run id', () => {
    const first = combineQueryResults([
      answered('q1', [item('a', 'https://example.org/a')]),
      answered('q2', [item('b', 'https://example.org/b')]),
    ]);
    const second = combineQueryResults([
      answered('q1', [item('a', 'https://example.org/a')]),
      answered('q2', [item('c', 'https://example.org/c')]),
    ]);

    expect(first?.researchRunId).toBe('q1');
    expect(first?.sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(first?.sha256).not.toBe(second?.sha256);
  });

  it('feeds the evidence-gap merge: primary sources win the per-pass cap of new items', () => {
    const base = { items: [item('base', 'https://example.org/base')] };
    const noise = Array.from({ length: EVIDENCE_GAP_MAX_NEW_ITEMS + 2 }, (_, i) =>
      item(`n${String(i)}`, `https://blog${String(i)}.example.com/x`),
    );
    const combined = combineQueryResults([
      answered('q1', noise),
      answered('q2', [item('arx', 'https://arxiv.org/abs/2310.13548')]),
    ]);

    const merged = mergeEvidenceBundles(base, combined?.bundle ?? {});

    expect(merged.addedIds).toHaveLength(EVIDENCE_GAP_MAX_NEW_ITEMS);
    expect(merged.addedIds[0]).toBe('arx');
  });
});
