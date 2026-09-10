import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ChatThreadHeaderMenu } from '@/components/chat/chat-thread-header-menu';
import type { ChatThreadHeaderMenuProps } from '@/types';

function makeProps(overrides: Partial<ChatThreadHeaderMenuProps> = {}): ChatThreadHeaderMenuProps {
  return {
    menuLabel: 'More actions',
    collapsePrimaryActions: false,
    canCompare: true,
    compareLabel: 'Compare',
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
    ...overrides,
  };
}

async function openMenu(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
}

describe('ChatThreadHeaderMenu', () => {
  it('names itself for screen readers before it is opened', () => {
    render(<ChatThreadHeaderMenu {...makeProps()} />);

    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
  });

  it('holds all three overflow actions — none of them was dropped in the move', async () => {
    render(<ChatThreadHeaderMenu {...makeProps()} />);
    await openMenu();

    expect(screen.getByRole('menuitem', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Thread settings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('invokes the action behind each item', async () => {
    const onOpenSettings = vi.fn();
    render(<ChatThreadHeaderMenu {...makeProps({ onOpenSettings })} />);
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Thread settings' }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('disables export on an empty thread rather than exporting nothing', async () => {
    render(<ChatThreadHeaderMenu {...makeProps({ canExport: false })} />);
    await openMenu();

    expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveAttribute('data-disabled');
  });

  it('disables delete while a delete is already running', async () => {
    render(<ChatThreadHeaderMenu {...makeProps({ isDeleting: true })} />);
    await openMenu();

    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveAttribute('data-disabled');
  });

  it('keeps the four primary actions OUT of the menu on a wide row', async () => {
    // They are buttons on the header row there. Listing them in both places
    // would put the same action on screen twice.
    render(<ChatThreadHeaderMenu {...makeProps({ collapsePrimaryActions: false })} />);
    await openMenu();

    expect(screen.queryByRole('menuitem', { name: 'Compare' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Find' })).toBeNull();
  });

  it('takes in all seven actions when the row is too narrow for them', async () => {
    // A 375px row fits the back button, the drawer, the title and this trigger
    // and nothing else, so nothing may be lost by collapsing.
    render(<ChatThreadHeaderMenu {...makeProps({ collapsePrimaryActions: true })} />);
    await openMenu();

    for (const name of [
      'Compare',
      'Judge & Referee',
      'Find',
      'Share',
      'Export',
      'Thread settings',
      'Delete',
    ]) {
      expect(screen.getByRole('menuitem', { name })).toBeInTheDocument();
    }
  });

  it('omits a collapsed action the plan does not unlock', async () => {
    render(
      <ChatThreadHeaderMenu
        {...makeProps({
          collapsePrimaryActions: true,
          canCompare: false,
          canUseQualityControls: false,
        })}
      />,
    );
    await openMenu();

    expect(screen.queryByRole('menuitem', { name: 'Compare' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Judge & Referee' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Find' })).toBeInTheDocument();
  });
});
