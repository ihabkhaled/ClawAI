import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ResearchToggle } from '@/components/chat/research-toggle';
import { ResearchMode } from '@/enums/research-mode.enum';
import type { SanitizedResearchProvider } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const providers: SanitizedResearchProvider[] = [];

describe('ResearchToggle', () => {
  it('hides the provider picker while research is off, to avoid overflowing the mobile toolbar', () => {
    render(
      <ResearchToggle
        value={{ mode: ResearchMode.NONE }}
        providers={providers}
        onChange={vi.fn()}
      />,
    );

    // Mode select is always present; the second (provider) combobox is not.
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });

  it('shows the provider picker once a research mode is selected', () => {
    render(
      <ResearchToggle
        value={{ mode: ResearchMode.SEARCH }}
        providers={providers}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('combobox')).toHaveLength(2);
  });

  // Both triggers held a minimum width and no maximum, so "Google Search
  // (Google SerpAPI)" grew the row past the edge of the screen instead of
  // clipping. On a phone they give; from sm up they keep their comfortable size.
  it('lets both triggers shrink and clip rather than push the row off screen', () => {
    render(
      <ResearchToggle
        value={{ mode: ResearchMode.SEARCH }}
        providers={providers}
        onChange={vi.fn()}
      />,
    );

    for (const trigger of screen.getAllByRole('combobox')) {
      expect(trigger).toHaveClass('min-w-0', 'flex-1', 'touch:[&>span]:truncate-fixed');
    }
  });
});
