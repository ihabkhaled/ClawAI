import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ComposerResearchChip } from '@/components/chat/composer-research-chip';
import { ResearchMode } from '@/enums/research-mode.enum';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values?.['value'] === undefined ? key : `${key}:${values['value']}`,
  }),
}));

const renderChip = (mode: ResearchMode, disabled = false, onChange = vi.fn()): void => {
  render(
    <ComposerResearchChip
      value={{ mode }}
      providers={[]}
      isProvidersLoading={false}
      onChange={onChange}
      disabled={disabled}
    />,
  );
};

describe('ComposerResearchChip', () => {
  it('names the active mode and keeps the research tour anchor', () => {
    renderChip(ResearchMode.SEARCH);

    const chip = screen.getByRole('button', {
      name: 'chat.composerMenu.chipLabel:research.modes.search',
    });
    expect(chip).toHaveTextContent('research.modes.search');
    expect(chip).toHaveAttribute('data-tour', 'composer-research');
    expect(chip.className).toContain('touch:h-11');
  });

  it('opens the research panel and changes the mode from it', () => {
    const onChange = vi.fn();
    renderChip(ResearchMode.AUTO, false, onChange);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('radio', { name: /research.modes.searchFetch/ }));

    expect(onChange).toHaveBeenCalledWith({ mode: ResearchMode.SEARCH_FETCH });
  });

  it('shows the no-provider message when research is on but none is configured', () => {
    renderChip(ResearchMode.AUTO);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('radiogroup', { name: 'research.toggle.providerLabel' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'research.toggle.autoProvider' })).toBeDisabled();
  });

  it('hands focus to the + button when No research is chosen, instead of dropping it to the page', () => {
    const plus = document.createElement('button');
    plus.setAttribute('data-tour', 'composer-attach');
    document.body.appendChild(plus);
    const onChange = vi.fn();
    renderChip(ResearchMode.AUTO, false, onChange);
    fireEvent.click(screen.getByRole('button', { name: /chipLabel/ }));
    fireEvent.click(screen.getByRole('radio', { name: /research.modes.none/ }));

    expect(onChange).toHaveBeenCalledWith({ mode: ResearchMode.NONE });
    expect(plus).toHaveFocus();
    expect(screen.queryByRole('radiogroup', { name: 'research.toggle.modeLabel' })).toBeNull();
    plus.remove();
  });

  it('stays open and keeps focus where it is when another mode is chosen', () => {
    const onChange = vi.fn();
    renderChip(ResearchMode.AUTO, false, onChange);
    fireEvent.click(screen.getByRole('button', { name: /chipLabel/ }));
    fireEvent.click(screen.getByRole('radio', { name: /research.modes.search(?![A-Z])/ }));

    expect(onChange).toHaveBeenCalledWith({ mode: ResearchMode.SEARCH });
    expect(screen.getByRole('radiogroup', { name: 'research.toggle.modeLabel' })).toBeVisible();
  });

  it('keeps the phone width override on its popover', () => {
    renderChip(ResearchMode.AUTO);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('dialog').className).toContain('touch:w-[min(22rem,calc(100vw-1rem))]');
  });

  it('is disabled while the composer is busy', () => {
    renderChip(ResearchMode.AUTO, true);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
