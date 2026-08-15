import { RouterErrorCode, RoutingLabCaseCategory } from '../../../../common/enums';
import type { RoutingLabManifestData } from '../types/routing-lab-manifest.types';
import { renderRoutingLabManifest } from '../utilities/routing-lab-manifest.utility';

const DATA: RoutingLabManifestData = {
  totalCases: 300,
  generatedAt: '2026-01-01T00:00:00.000Z',
  categoryCounts: {
    [RoutingLabCaseCategory.BASELINE]: 252,
    [RoutingLabCaseCategory.FAULT_SINGLE]: 15,
    [RoutingLabCaseCategory.FAULT_COMPOUND]: 15,
    [RoutingLabCaseCategory.EDGE_CASE]: 18,
  },
  passDecline: {
    passed: 250,
    declinedUnavailable: 30,
    declinedChainExhausted: 20,
    declinedByReason: { NO_PUBLISHED_CONFIGURATION: 1, CONFIGURATION_DISABLED: 29 },
    declinedByFinalErrorCode: { [RouterErrorCode.PROVIDER_5XX]: 20 },
  },
  fallbackDepth: {
    histogram: { 0: 200, 1: 40, 2: 10 },
    averageDepth: 0.32,
    maxDepth: 2,
    successCount: 250,
  },
  errorTaxonomy: {
    counts: { [RouterErrorCode.PROVIDER_5XX]: 20, [RouterErrorCode.TIMEOUT]: 5 },
    totalAttempts: 400,
    totalFailedAttempts: 25,
    distinctCodesObserved: 2,
  },
};

describe('renderRoutingLabManifest', () => {
  it('includes the title, generation timestamp and corpus size', () => {
    const markdown = renderRoutingLabManifest(DATA);
    expect(markdown).toContain('Batch 12');
    expect(markdown).toContain('2026-01-01T00:00:00.000Z');
    expect(markdown).toContain('300 cases');
  });

  it('carries the scope-note disclaimer about the full evidence programme', () => {
    const markdown = renderRoutingLabManifest(DATA);
    expect(markdown).toContain('1,000 replay decisions');
    expect(markdown).toContain('100 live provider-fault runs');
    expect(markdown).toContain('100 SSE-disruption runs');
    expect(markdown).toContain('100 browser runs');
  });

  it('lists every one of the 15 RouterErrorCode values, observed or not', () => {
    const markdown = renderRoutingLabManifest(DATA);
    for (const code of Object.values(RouterErrorCode)) {
      expect(markdown).toContain(code);
    }
    // Never observed in this fixture — must still appear with a zero count.
    expect(markdown).toMatch(/AUTHORIZATION_FAILED \| 0 \| no/);
  });

  it('renders the four section headers in order', () => {
    const markdown = renderRoutingLabManifest(DATA);
    const order = [
      '## 1. Category breakdown',
      '## 2. Pass / decline breakdown',
      '## 3. Fallback-depth distribution',
      '## 4. Error-taxonomy distribution',
    ].map((heading) => markdown.indexOf(heading));

    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
