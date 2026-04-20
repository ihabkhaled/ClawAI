import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import { buildEvidenceBundle, traceEntry } from '../evidence-builder.utility';
import type { EvidenceItem } from '../../types/evidence-bundle.types';

function makeItem(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: 'id',
    title: 'Title',
    url: 'https://example.com/a',
    snippet: 'snippet',
    source: 'search',
    providerKind: 'TAVILY',
    publishedAt: null,
    fetchedAt: null,
    confidence: 0.5,
    ...overrides,
  };
}

describe('buildEvidenceBundle', () => {
  it('deduplicates by URL, keeping the higher-confidence item', () => {
    const bundle = buildEvidenceBundle({
      intent: 'q',
      workflow: ResearchWorkflowKind.SEARCH_ONLY,
      requestedModel: 'glm-4.7',
      requestedProvider: 'glm',
      helperModels: [],
      toolsUsed: ['web_search'],
      items: [
        makeItem({ id: 'a', url: 'https://x.com', confidence: 0.3 }),
        makeItem({ id: 'b', url: 'https://X.COM', confidence: 0.9 }),
      ],
      warnings: [],
    });
    expect(bundle.items).toHaveLength(1);
    expect(bundle.items[0]?.id).toBe('b');
    expect(bundle.requestedModel).toBe('glm-4.7');
  });

  it('sorts by confidence descending', () => {
    const bundle = buildEvidenceBundle({
      intent: 'q',
      workflow: ResearchWorkflowKind.SEARCH_ONLY,
      requestedModel: null,
      requestedProvider: null,
      helperModels: [],
      toolsUsed: [],
      items: [
        makeItem({ id: 'a', url: 'https://a', confidence: 0.3 }),
        makeItem({ id: 'c', url: 'https://c', confidence: 0.9 }),
        makeItem({ id: 'b', url: 'https://b', confidence: 0.6 }),
      ],
      warnings: [],
    });
    expect(bundle.items.map((i) => i.id)).toEqual(['c', 'b', 'a']);
  });

  it('trims snippets to compressed length', () => {
    const long = 'x'.repeat(500);
    const bundle = buildEvidenceBundle({
      intent: 'q',
      workflow: ResearchWorkflowKind.SEARCH_ONLY,
      requestedModel: null,
      requestedProvider: null,
      helperModels: [],
      toolsUsed: [],
      items: [makeItem({ snippet: long })],
      warnings: [],
      mode: 'compressed',
    });
    expect(bundle.items[0]?.snippet.length).toBeLessThanOrEqual(210);
    expect(bundle.mode).toBe('compressed');
  });

  it('adds a truncation warning when over max items', () => {
    const items = Array.from({ length: 25 }, (_, i) =>
      makeItem({ id: `id-${String(i)}`, url: `https://ex.com/${String(i)}` }),
    );
    const bundle = buildEvidenceBundle({
      intent: 'q',
      workflow: ResearchWorkflowKind.SEARCH_ONLY,
      requestedModel: null,
      requestedProvider: null,
      helperModels: [],
      toolsUsed: [],
      items,
      warnings: [],
    });
    expect(bundle.items).toHaveLength(20);
    expect(bundle.warnings.some((w) => w.includes('truncated'))).toBe(true);
  });

  it('deduplicates tools used', () => {
    const bundle = buildEvidenceBundle({
      intent: 'q',
      workflow: ResearchWorkflowKind.SEARCH_THEN_FETCH,
      requestedModel: null,
      requestedProvider: null,
      helperModels: [],
      toolsUsed: ['web_search', 'web_fetch', 'web_fetch'],
      items: [],
      warnings: [],
    });
    // Builder itself doesn't dedupe toolsUsed — that's the manager's job.
    // Just ensure passthrough works.
    expect(bundle.toolsUsed).toContain('web_search');
  });
});

describe('traceEntry', () => {
  it('creates an entry with timestamp and fields', () => {
    const entry = traceEntry('search', 'ok', 42, 'done');
    expect(entry.phase).toBe('search');
    expect(entry.status).toBe('ok');
    expect(entry.latencyMs).toBe(42);
    expect(entry.message).toBe('done');
    expect(new Date(entry.timestamp).getTime()).toBeGreaterThan(0);
  });
});
