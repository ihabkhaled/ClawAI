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

  // Both triggers held a minimum width and no maximum, so "Google / SerpAPI
  // (Google / SerpAPI)" grew one of them to 409px, pushed the preview button
  // onto a second row and wrapped inside a 36px control. A fixed width from sm
  // up is what stops the row reflowing around whichever provider is selected.
  it('gives both triggers a width that the selected value cannot change', () => {
    render(
      <ResearchToggle
        value={{ mode: ResearchMode.SEARCH }}
        providers={providers}
        onChange={vi.fn()}
      />,
    );

    const [mode, provider] = screen.getAllByRole('combobox');
    expect(mode).toHaveClass('sm:w-[10rem]', 'sm:flex-none');
    expect(provider).toHaveClass('sm:w-[12rem]', 'sm:flex-none');
  });

  // `touch:[&>span]:truncate-fixed` looked right and did nothing: Tailwind only
  // composes variants onto utilities it knows, and truncate-fixed is a rule in
  // globals.css. Plain on the trigger, it reaches the value span and trims it.
  it('trims the selected value instead of wrapping it inside the control', () => {
    render(
      <ResearchToggle
        value={{ mode: ResearchMode.SEARCH }}
        providers={providers}
        onChange={vi.fn()}
      />,
    );

    for (const trigger of screen.getAllByRole('combobox')) {
      expect(trigger).toHaveClass('truncate-fixed', 'min-w-0', 'flex-1');
      expect(trigger.className).not.toContain('touch:[&>span]:truncate-fixed');
    }
  });
});
