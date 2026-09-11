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
  // onto a second row and wrapped inside a 36px control. A fixed width is what
  // stops the row reflowing around whichever provider is selected.
  //
  // It is now fixed at EVERY width, not only from `sm`. Below `sm` these were
  // `min-w-0 flex-1`, which let them shrink below their content once the model
  // trigger started showing a name — the mode select rendered as "N…" in about
  // 90px on a 375px screen. The toolbar row scrolls sideways, and that is the
  // designed answer to a row that does not fit.
  it('gives both triggers a width that the selected value cannot change', () => {
    render(
      <ResearchToggle
        value={{ mode: ResearchMode.SEARCH }}
        providers={providers}
        onChange={vi.fn()}
      />,
    );

    const [mode, provider] = screen.getAllByRole('combobox');
    expect(mode).toHaveClass('w-[8.5rem]', 'shrink-0', 'sm:w-[10rem]');
    expect(provider).toHaveClass('w-[9.5rem]', 'shrink-0', 'sm:w-[12rem]');
    // Never flex-1: that is what let them shrink below their own content.
    expect(mode?.className ?? '').not.toContain('flex-1');
    expect(provider?.className ?? '').not.toContain('flex-1');
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
      expect(trigger).toHaveClass('truncate-fixed');
      expect(trigger.className).not.toContain('touch:[&>span]:truncate-fixed');
    }
  });

  it('gives each select an accessible name', () => {
    // A Radix Select trigger renders its VALUE, not a label. Without an
    // aria-label a screen reader announces "No research, combobox" and never
    // says what is being chosen; Lighthouse reported it as a button with no
    // accessible name at all.
    render(
      <ResearchToggle
        value={{ mode: ResearchMode.SEARCH }}
        providers={providers}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'research.toggle.modeLabel' })).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'research.toggle.providerLabel' }),
    ).toBeInTheDocument();
  });
});
