import { FindingConfidence } from '../../../../common/enums/finding-confidence.enum';
import { SiteAuditManager } from '../site-audit.manager';
import type { HtmlMetadata } from '../../../../common/types/html-extract.types';
import type { EvidenceItem } from '../../types/evidence-bundle.types';

function buildMetadata(overrides: Partial<HtmlMetadata> = {}): HtmlMetadata {
  return {
    description: 'A page',
    robotsDirective: null,
    canonicalUrl: 'https://example.com/page',
    hreflangAlternates: [],
    openGraph: {},
    twitterCard: {},
    jsonLd: [],
    feedUrls: [],
    ...overrides,
  };
}

function buildItem(overrides: Partial<EvidenceItem> = {}, metadata?: HtmlMetadata): EvidenceItem {
  const url = overrides.url ?? 'https://example.com/page';
  return {
    id: `id-${url}`,
    title: 'A Page',
    url,
    snippet: 'content',
    source: 'fetch',
    providerKind: null,
    publishedAt: null,
    fetchedAt: null,
    confidence: 0.9,
    structured: {
      crawlDiscoveryMethod: 'user',
      metadata: metadata ?? buildMetadata({ canonicalUrl: url }),
    },
    ...overrides,
  };
}

/**
 * Confidence-scored findings, section 24/37 of the web-intelligence spec:
 * a claim about crawled pages must name its evidence and separate "computed
 * with certainty" from "observed in fetched markup, with a stated caveat."
 */
describe('SiteAuditManager', () => {
  const manager = new SiteAuditManager();

  it('returns no findings when there is nothing to analyze', () => {
    expect(manager.analyze([])).toEqual([]);
  });

  it('ignores items with no crawl metadata (e.g. search results)', () => {
    const searchItem: EvidenceItem = {
      id: 's1',
      title: 'Result',
      url: 'https://example.com/found',
      snippet: 'a snippet',
      source: 'search',
      providerKind: 'OLLAMA_WEB',
      publishedAt: null,
      fetchedAt: null,
      confidence: 0.5,
    };
    expect(manager.analyze([searchItem])).toEqual([]);
  });

  it('flags pages missing a meta description, naming the affected ids', () => {
    const withDescription = buildItem(
      { url: 'https://example.com/a' },
      buildMetadata({ canonicalUrl: 'https://example.com/a' }),
    );
    const withoutDescription = buildItem(
      { url: 'https://example.com/b' },
      buildMetadata({ description: null, canonicalUrl: 'https://example.com/b' }),
    );

    const findings = manager.analyze([withDescription, withoutDescription]);

    const finding = findings.find((f) => f.category === 'meta-description');
    expect(finding).toBeDefined();
    expect(finding?.confidence).toBe(FindingConfidence.HIGH);
    expect(finding?.evidenceItemIds).toEqual([withoutDescription.id]);
    expect(finding?.claim).toContain('1 of 2');
    expect(finding?.limitations.length).toBeGreaterThan(0);
  });

  it('flags pages missing a canonical URL', () => {
    const item = buildItem({ url: 'https://example.com/a' }, buildMetadata({ canonicalUrl: null }));

    const findings = manager.analyze([item]);

    const finding = findings.find((f) => f.category === 'canonical-url');
    expect(finding?.evidenceItemIds).toEqual([item.id]);
  });

  it('flags a canonical URL that points somewhere other than the fetched page', () => {
    const item = buildItem(
      { url: 'https://example.com/page-2' },
      buildMetadata({ canonicalUrl: 'https://example.com/page-1' }),
    );

    const findings = manager.analyze([item]);

    const finding = findings.find((f) => f.category === 'canonical-mismatch');
    expect(finding).toBeDefined();
    expect(finding?.confidence).toBe(FindingConfidence.CONFIRMED);
    expect(finding?.evidenceItemIds).toEqual([item.id]);
  });

  it('does not flag a canonical URL that matches after normalizing a trailing slash or query', () => {
    const item = buildItem(
      { url: 'https://example.com/page?utm_source=x' },
      buildMetadata({ canonicalUrl: 'https://example.com/page/' }),
    );

    const findings = manager.analyze([item]);

    expect(findings.find((f) => f.category === 'canonical-mismatch')).toBeUndefined();
  });

  it('flags pages sharing an identical title', () => {
    const a = buildItem({ url: 'https://example.com/a', title: 'Same Title' });
    const b = buildItem({ url: 'https://example.com/b', title: 'Same Title' });
    const c = buildItem({ url: 'https://example.com/c', title: 'Different Title' });

    const findings = manager.analyze([a, b, c]);

    const finding = findings.find((f) => f.category === 'duplicate-title');
    expect(finding).toBeDefined();
    expect(finding?.confidence).toBe(FindingConfidence.CONFIRMED);
    expect(finding?.evidenceItemIds.sort()).toEqual([a.id, b.id].sort());
  });

  it('does not flag a title shared by only one page', () => {
    const a = buildItem({ url: 'https://example.com/a', title: 'Unique' });

    const findings = manager.analyze([a]);

    expect(findings.find((f) => f.category === 'duplicate-title')).toBeUndefined();
  });

  it('produces no findings for a fully clean set of pages', () => {
    const a = buildItem({ url: 'https://example.com/a', title: 'A' });
    const b = buildItem({ url: 'https://example.com/b', title: 'B' });

    expect(manager.analyze([a, b])).toEqual([]);
  });
});
