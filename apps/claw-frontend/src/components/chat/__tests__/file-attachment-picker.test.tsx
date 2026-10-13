import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FileAttachmentPicker } from '@/components/chat/file-attachment-picker';
import { ComposerControlVariant } from '@/enums';
import type {
  FileLibraryDialogProps,
  FileLibraryMenuInnerProps,
} from '@/types/file-library-ui.types';

import { echoTranslate } from './file-library-fixtures';

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: echoTranslate }),
}));

// The picker's job is the trigger, the open state and hosting the dialog; the
// menu and dialog have their own suites.
vi.mock('@/components/chat/file-library-menu', () => ({
  FileLibraryMenu: ({ onDone, onBrowseAll, disabled }: FileLibraryMenuInnerProps) => (
    <div data-testid="menu" data-disabled={String(disabled === true)}>
      <button type="button" onClick={onDone}>
        done
      </button>
      <button type="button" onClick={onBrowseAll}>
        browse
      </button>
    </div>
  ),
}));
vi.mock('@/components/chat/file-library-dialog', () => ({
  FileLibraryDialog: ({ open, onOpenChange }: FileLibraryDialogProps) =>
    open ? (
      <div data-testid="dialog">
        <button type="button" onClick={() => onOpenChange(false)}>
          close-dialog
        </button>
      </div>
    ) : null,
}));

function renderPicker(
  overrides: Partial<React.ComponentProps<typeof FileAttachmentPicker>> = {},
): void {
  render(
    <FileAttachmentPicker
      selectedFileIds={[]}
      onChange={vi.fn()}
      ingestFiles={vi.fn()}
      isUploading={false}
      {...overrides}
    />,
  );
}

async function openMenu(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: /chat\.attachFiles/ }));
}

describe('FileAttachmentPicker', () => {
  it('keeps its trigger and shows the selected count', () => {
    renderPicker({ selectedFileIds: ['a', 'b'] });

    expect(screen.getByRole('button', { name: /chat\.attachFiles/ })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows the shared library menu when opened', async () => {
    renderPicker();
    expect(screen.queryByTestId('menu')).toBeNull();

    await openMenu();

    expect(await screen.findByTestId('menu')).toBeInTheDocument();
  });

  it('closes the menu when the library says it is done', async () => {
    renderPicker();
    await openMenu();

    await userEvent.click(await screen.findByText('done'));

    expect(screen.queryByTestId('menu')).toBeNull();
  });

  it('is a popover, not a menu, so the library inside it can take Tab and the arrow keys', async () => {
    renderPicker();
    await openMenu();

    await screen.findByTestId('menu');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the popover and opens the dialog in the same step, and the dialog outlives it', async () => {
    renderPicker();
    await openMenu();

    await userEvent.click(await screen.findByText('browse'));
    expect(await screen.findByTestId('dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('menu')).toBeNull();

    fireEvent.click(screen.getByText('close-dialog'));
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('keeps the count badge on the logical end edge for RTL', () => {
    renderPicker({
      selectedFileIds: ['a'],
      variant: ComposerControlVariant.Compact,
    });
    const badge = screen.getByText('1');
    expect(badge.className).toMatch(/-end-1/);
    expect(badge.className).not.toMatch(/-right-1|\bml-/);
  });

  it('puts the badge inline-start spaced after the label in the default variant', () => {
    renderPicker({ selectedFileIds: ['a'] });
    const badge = screen.getByText('1');
    expect(badge.className).toMatch(/\bms-1\b/);
    expect(badge.className).not.toMatch(/\bml-1\b/);
  });

  it('is inert when disabled', () => {
    renderPicker({ disabled: true });
    expect(screen.getByRole('button', { name: /chat\.attachFiles/ })).toBeDisabled();
  });

  it('collapses to an icon-only trigger in the compact variant', () => {
    renderPicker({ variant: ComposerControlVariant.Compact });
    const trigger = screen.getByRole('button', { name: 'chat.attachFiles' });
    expect(trigger).toHaveTextContent('');
  });

  it('keeps the label in the compact variant when asked', () => {
    renderPicker({ variant: ComposerControlVariant.Compact, showLabel: true });
    expect(screen.getByRole('button', { name: /chat\.attachFiles/ })).toHaveTextContent(
      'chat.attachFiles',
    );
  });
});
