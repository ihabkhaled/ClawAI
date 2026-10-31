import { allocateCharBudget, canonicalUrlKey, selectFetchTargets } from '../fetch-targets.utility';
import { buildEvidenceBundle } from '../evidence-builder.utility';
import { ProviderSelectionMode } from '../../../../common/enums/provider-selection-mode.enum';
import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import type { EvidenceItem } from '../../types/evidence-bundle.types';

describe('canonicalUrlKey', () => {
  it('ignores scheme, www, fragment, tracking params, param order and trailing slash', () => {
    const a = canonicalUrlKey('https://www.Example.com/post/?utm_source=x&b=2&a=1#top');
    const b = canonicalUrlKey('http://example.com/post?a=1&b=2');
    expect(a).toBe(b);
  });

  it('keeps different pages apart', () => {
    expect(canonicalUrlKey('https://example.com/a')).not.toBe(
      canonicalUrlKey('https://example.com/b'),
    );
  });
});

describe('selectFetchTargets', () => {
  const hit = (url: string): { url: string } => ({ url });

  it('prefers distinct hosts, caps per host, keeps rank order, drops duplicates', () => {
    const ranked = [
      hit('https://a.com/1'),
      hit('https://a.com/2'),
      hit('https://a.com/3'),
      hit('https://b.com/1'),
      hit('https://www.a.com/1/?utm_medium=x'),
      hit('https://c.com/1'),
    ];
    const picked = selectFetchTargets(ranked, 4, 2).map((h) => h.url);
    expect(picked).toEqual([
      'https://a.com/1',
      'https://a.com/2',
      'https://b.com/1',
      'https://c.com/1',
    ]);
  });

  it('never exceeds the limit', () => {
    const ranked = Array.from({ length: 30 }, (_, i) => hit(`https://h${String(i)}.com/`));
    expect(selectFetchTargets(ranked, 8, 2)).toHaveLength(8);
  });
});

describe('allocateCharBudget', () => {
  it('gives small pages what they need and shares the rest equally', () => {
    expect(allocateCharBudget([500, 50_000, 50_000], 10_500, 100)).toEqual([500, 5_000, 5_000]);
  });

  it('never goes below the floor and gives the remainder to the best-ranked page', () => {
    const limits = allocateCharBudget([9_999, 9_999, 9_999], 10, 1_500);
    expect(limits).toEqual([1_500, 1_500, 1_500]);
    const shared = allocateCharBudget([9_000, 9_000, 9_000], 10_001, 100);
    expect(shared[0]).toBe(3_335);
    expect(shared[1]).toBe(3_333);
    expect(shared.reduce((a, b) => a + b, 0)).toBe(10_001);
  });
});

describe('evidence bundle context budget', () => {
  const selection = {
    providerId: null,
    providerName: null,
    providerKind: null,
    selectionMode: ProviderSelectionMode.AUTO,
    fallbackUsed: false,
    attemptedProviders: [],
  };
  const page = (n: number, length: number, confidence: number): EvidenceItem => ({
    id: String(n),
    title: null,
    url: `https://h${String(n)}.com/`,
    snippet: 'x'.repeat(length),
    source: 'fetch',
    providerKind: null,
    publishedAt: null,
    fetchedAt: null,
    confidence,
  });

  it('lets fetched pages exceed the flat 1500 chars but stays inside the total budget', () => {
    const items = Array.from({ length: 8 }, (_, i) => page(i, 32_000, 0.9 - i * 0.01));
    const bundle = buildEvidenceBundle({
      intent: 'q',
      workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
      requestedModel: null,
      requestedProvider: null,
      providerSelection: selection,
      helperModels: [],
      toolsUsed: [],
      items,
      warnings: [],
    });
    const total = bundle.items.reduce((sum, item) => sum + item.snippet.length, 0);
    expect(bundle.items[0]?.snippet.length).toBeGreaterThan(1_500);
    expect(total).toBeLessThanOrEqual(96_000 + 8);
  });

  it('keeps the flat limit for search hits and compressed mode', () => {
    const search: EvidenceItem = { ...page(1, 5_000, 0.5), source: 'search' };
    const bundle = buildEvidenceBundle({
      intent: 'q',
      workflow: ResearchWorkflowKind.SEARCH_ONLY,
      requestedModel: null,
      requestedProvider: null,
      providerSelection: selection,
      helperModels: [],
      toolsUsed: [],
      items: [search],
      warnings: [],
    });
    expect(bundle.items[0]?.snippet.length).toBe(1_501);
  });
});
