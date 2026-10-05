import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EvidenceViewer } from '@/components/research/evidence-viewer';
import { ResearchProviderSelectionMode } from '@/enums/research-provider-selection-mode.enum';
import type { ResearchEvidenceBundle } from '@/types';

const bundle: ResearchEvidenceBundle = {
  intent: 'mobile regression',
  workflow: 'web',
  requestedModel: null,
  requestedProvider: null,
  providerSelection: {
    providerId: null,
    providerName: null,
    providerKind: null,
    selectionMode: ResearchProviderSelectionMode.AUTO,
    fallbackUsed: false,
    attemptedProviders: [],
  },
  helperModels: [],
  toolsUsed: [],
  items: [
    {
      id: 'evidence-1',
      title: 'Long source',
      url: `https://example.com/${'unbroken'.repeat(30)}`,
      snippet: 'A result snippet',
      source: 'example.com',
      providerKind: null,
      publishedAt: null,
      fetchedAt: null,
      confidence: 0.9,
    },
  ],
  warnings: [],
  generatedAt: '2026-08-20T00:00:00.000Z',
  mode: 'standard',
};

describe('EvidenceViewer fetch strategy chip', () => {
  it('shows the tier that served a fetched page, and nothing for a search hit', () => {
    const [base] = bundle.items;
    if (base === undefined) {
      throw new Error('fixture has no item');
    }
    const withFetch: ResearchEvidenceBundle = {
      ...bundle,
      items: [
        { ...base, id: 'a', fetch: { strategy: 'FIRECRAWL', attempts: [] } },
        { ...base, id: 'b' },
      ],
    };
    render(<EvidenceViewer bundle={withFetch} t={(key) => key} />);

    const chips = screen.getAllByTestId('fetch-strategy-chip');
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveTextContent('narration.strategyLabel narration.strategyFirecrawl');
  });
});

describe('EvidenceViewer mobile layout', () => {
  it('contains long source URLs inside shrinkable evidence cards', () => {
    const { container } = render(<EvidenceViewer bundle={bundle} t={(key) => key} />);

    expect(container.firstElementChild).toHaveClass('min-w-0', 'max-w-full');
    expect(screen.getByRole('link')).toHaveClass('min-w-0', 'break-all');
    expect(screen.getByRole('listitem')).toHaveClass('min-w-0', 'max-w-full');
  });
});
