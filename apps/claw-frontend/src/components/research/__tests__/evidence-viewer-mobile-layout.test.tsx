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

describe('EvidenceViewer mobile layout', () => {
  it('contains long source URLs inside shrinkable evidence cards', () => {
    const { container } = render(<EvidenceViewer bundle={bundle} t={(key) => key} />);

    expect(container.firstElementChild).toHaveClass('min-w-0', 'max-w-full');
    expect(screen.getByRole('link')).toHaveClass('min-w-0', 'break-all');
    expect(screen.getByRole('listitem')).toHaveClass('min-w-0', 'max-w-full');
  });
});
