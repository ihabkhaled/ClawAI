import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FileAttachmentPicker } from '@/components/chat/file-attachment-picker';

import { echoTranslate, makeLibraryFiles } from './file-library-fixtures';

// The real Popover, the real Radix Dialog and the real library: only the data
// and the translations are stubbed. This is the Browse-all handoff a browser
// does, where a modal dialog opened from a popover must give the page back.
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: echoTranslate }),
}));
vi.mock('@/hooks/files/use-files', () => ({
  useFiles: () => ({ files: makeLibraryFiles(3), isLoading: false, isError: false }),
}));
vi.mock('@/hooks/files/use-file-thumbnail-blob', () => ({
  useFileThumbnailBlob: () => ({ blobUrl: null, isError: false }),
}));

function renderPicker(onChange = vi.fn()): ReturnType<typeof vi.fn> {
  render(
    <FileAttachmentPicker
      selectedFileIds={[]}
      onChange={onChange}
      ingestFiles={vi.fn()}
      isUploading={false}
    />,
  );
  return onChange;
}

async function openBrowseAll(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: /chat\.attachFiles/ }));
  await userEvent.click(await screen.findByText('chat.fileLibrary.browseAll'));
  await screen.findByTestId('file-library-dialog');
}

describe('FileAttachmentPicker -> Browse all (real Popover and Dialog)', () => {
  it('leaves the page clickable after Cancel closes the dialog', async () => {
    renderPicker();
    await openBrowseAll();
    expect(screen.queryByTestId('file-library-menu')).toBeNull();
    // Proves the check below can fail: a modal dialog does lock the page while open.
    expect(document.body.style.pointerEvents).toBe('none');

    await userEvent.click(screen.getByText('chat.fileLibrary.dialog.cancel'));

    await waitFor(() => expect(screen.queryByTestId('file-library-dialog')).toBeNull());
    expect(document.body.style.pointerEvents).not.toBe('none');
    expect(document.body).not.toHaveAttribute('data-scroll-locked', '1');
  });

  it('attaches the draft, closes both layers and gives the page back', async () => {
    const onChange = renderPicker();
    await openBrowseAll();

    await userEvent.click(screen.getByRole('checkbox', { name: /doc-3\.pdf/ }));
    await userEvent.click(screen.getByText('chat.fileLibrary.dialog.attachCount:1'));

    expect(onChange).toHaveBeenCalledWith(['file-3']);
    await waitFor(() => expect(screen.queryByTestId('file-library-dialog')).toBeNull());
    expect(screen.queryByTestId('file-library-menu')).toBeNull();
    expect(document.body.style.pointerEvents).not.toBe('none');
  });

  it('can be reopened after the dialog closed', async () => {
    renderPicker();
    await openBrowseAll();
    await userEvent.click(screen.getByText('chat.fileLibrary.dialog.cancel'));
    await waitFor(() => expect(screen.queryByTestId('file-library-dialog')).toBeNull());

    await userEvent.click(screen.getByRole('button', { name: /chat\.attachFiles/ }));

    expect(await screen.findByTestId('file-library-menu')).toBeInTheDocument();
  });
});
