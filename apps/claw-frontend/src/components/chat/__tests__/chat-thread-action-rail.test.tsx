import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ChatThreadActionRail } from '@/components/chat/chat-thread-action-rail';
import type { ChatThreadActionRailProps } from '@/types';

function makeProps(overrides: Partial<ChatThreadActionRailProps> = {}): ChatThreadActionRailProps {
  return {
    canCompare: true,
    compareLabel: 'Compare Models',
    compareIsOpen: false,
    onCompare: vi.fn(),
    canUseQualityControls: true,
    qualityLabel: 'Judge & Referee',
    qualityIsOpen: false,
    onQuality: vi.fn(),
    searchLabel: 'Find',
    searchIsOpen: false,
    onSearch: vi.fn(),
    shareButtonProps: { label: 'Share', isShared: false, onClick: vi.fn() },
    menuProps: {
      menuLabel: 'More actions',
      // False on purpose: the rail only exists where the four primary actions
      // are rendered as its own buttons, so the menu must not repeat them.
      collapsePrimaryActions: false,
      canCompare: true,
      compareLabel: 'Compare Models',
      onCompare: vi.fn(),
      canUseQualityControls: true,
      qualityLabel: 'Judge & Referee',
      onQuality: vi.fn(),
      searchLabel: 'Find',
      onSearch: vi.fn(),
      shareLabel: 'Share',
      onShare: vi.fn(),
      exportLabel: 'Export',
      onExport: vi.fn(),
      canExport: true,
      settingsLabel: 'Thread settings',
      onOpenSettings: vi.fn(),
      deleteLabel: 'Delete',
      onDelete: vi.fn(),
      isDeleting: false,
    },
    ...overrides,
  };
}

describe('ChatThreadActionRail — the header row, stood on its end', () => {
  it('still reaches every control that used to be on the header row', async () => {
    render(<ChatThreadActionRail {...makeProps()} />);

    // The four that were direct buttons stay direct buttons.
    expect(screen.getByRole('button', { name: 'Compare Models' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Judge & Referee' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Find' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();

    // ...and the three that were behind the `…` are still behind the `…`.
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.getByRole('menuitem', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Thread settings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('names each icon-only control, because the rail is too narrow for a word', () => {
    render(<ChatThreadActionRail {...makeProps()} />);

    // No visible text on any of them — so the accessible name is the only name,
    // and a missing aria-label would leave a button announced as "button".
    for (const name of ['Compare Models', 'Judge & Referee', 'Find', 'Share']) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveAttribute('title', name);
      expect(button.textContent).toBe('');
    }
  });

  it('invokes the action behind each button', async () => {
    const onCompare = vi.fn();
    const onQuality = vi.fn();
    const onSearch = vi.fn();
    const onShare = vi.fn();
    render(
      <ChatThreadActionRail
        {...makeProps({
          onCompare,
          onQuality,
          onSearch,
          shareButtonProps: { label: 'Share', isShared: false, onClick: onShare },
        })}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Compare Models' }));
    await userEvent.click(screen.getByRole('button', { name: 'Judge & Referee' }));
    await userEvent.click(screen.getByRole('button', { name: 'Find' }));
    await userEvent.click(screen.getByRole('button', { name: 'Share' }));

    expect(onCompare).toHaveBeenCalledTimes(1);
    expect(onQuality).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('reports which panel is open, so the rail is state and not just a launcher', () => {
    render(<ChatThreadActionRail {...makeProps({ qualityIsOpen: true, searchIsOpen: true })} />);

    expect(screen.getByRole('button', { name: 'Judge & Referee' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Find' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Compare Models' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('drops the plan-gated controls without dropping the rest', () => {
    render(
      <ChatThreadActionRail {...makeProps({ canCompare: false, canUseQualityControls: false })} />,
    );

    expect(screen.queryByRole('button', { name: 'Compare Models' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Judge & Referee' })).not.toBeInTheDocument();
    // Find and Share are not plan-gated; neither is the menu.
    expect(screen.getByRole('button', { name: 'Find' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
  });

  it('stacks its controls in one column rather than laying out a second row', () => {
    const { container } = render(<ChatThreadActionRail {...makeProps()} />);
    const rail = container.firstElementChild;

    expect(rail?.className).toContain('flex-col');
    // `self-start`: the rail sits at the top of the body row beside the
    // transcript. Stretched, it would draw a border the full height of the
    // conversation for the sake of five buttons.
    expect(rail?.className).toContain('self-start');
    expect(rail?.className).toContain('shrink-0');
  });
});
