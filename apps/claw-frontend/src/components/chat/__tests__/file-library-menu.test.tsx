import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileLibraryMenu } from '@/components/chat/file-library-menu';
import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/constants/composer-attachment.constants';
import { FileIngestionStatus } from '@/enums';
import type { UploadedFile } from '@/types/file.types';

import { echoTranslate, makeLibraryFile, makeLibraryFiles } from './file-library-fixtures';

const filesState: { files: UploadedFile[]; isLoading: boolean; isError: boolean } = {
  files: [],
  isLoading: false,
  isError: false,
};

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: echoTranslate }),
}));
vi.mock('@/hooks/files/use-files', () => ({ useFiles: () => filesState }));
vi.mock('@/hooks/files/use-file-thumbnail-blob', () => ({
  useFileThumbnailBlob: (fileId: string, enabled: boolean) => ({
    blobUrl: enabled ? `blob:${fileId}` : null,
    isError: false,
  }),
}));
vi.mock('@/components/chat/archive-member-dialog', () => ({
  ArchiveMemberDialog: ({ archive }: { archive: UploadedFile | null }) =>
    archive === null ? null : <div data-testid="archive-dialog">{archive.filename}</div>,
}));

function renderMenu(
  overrides: Partial<React.ComponentProps<typeof FileLibraryMenu>> = {},
): ReturnType<typeof vi.fn>[] {
  const onChange = vi.fn();
  const ingestFiles = vi.fn();
  const onDone = vi.fn();
  render(
    <FileLibraryMenu
      selectedFileIds={[]}
      onChange={onChange}
      ingestFiles={ingestFiles}
      isUploading={false}
      onDone={onDone}
      {...overrides}
    />,
  );
  return [onChange, ingestFiles, onDone];
}

beforeEach(() => {
  filesState.files = makeLibraryFiles(9);
  filesState.isLoading = false;
  filesState.isError = false;
});

describe('FileLibraryMenu quick list', () => {
  it('shows the four most recent files, newest first', () => {
    renderMenu();

    const rows = screen.getAllByTestId('file-library-row');
    expect(rows).toHaveLength(4);
    expect(within(rows[0] as HTMLElement).getByText('doc-9.pdf')).toBeInTheDocument();
    expect(within(rows[3] as HTMLElement).getByText('doc-6.pdf')).toBeInTheDocument();
    expect(screen.getByText('chat.fileLibrary.recent')).toBeInTheDocument();
  });

  it('puts the full name in a title attribute for truncated names', () => {
    renderMenu();
    expect(screen.getByRole('checkbox', { name: /doc-9\.pdf/ })).toHaveAttribute(
      'title',
      'doc-9.pdf',
    );
  });

  it('searches every file, not only the recent seven', async () => {
    renderMenu();

    await userEvent.type(screen.getByLabelText('chat.fileLibrary.searchLabel'), 'doc-1');

    const rows = screen.getAllByTestId('file-library-row');
    expect(rows).toHaveLength(1);
    expect(within(rows[0] as HTMLElement).getByText('doc-1.pdf')).toBeInTheDocument();
    expect(screen.getByText('chat.fileLibrary.results')).toBeInTheDocument();
  });

  it('says nothing matched, then clears the search from the x button', async () => {
    renderMenu();
    const search = screen.getByLabelText('chat.fileLibrary.searchLabel');

    await userEvent.type(search, 'zzz');
    expect(screen.getByTestId('file-library-empty')).toHaveTextContent(
      'chat.fileLibrary.noResults:zzz',
    );

    await userEvent.click(screen.getByLabelText('chat.fileLibrary.clearSearch'));
    expect(search).toHaveValue('');
    expect(screen.getAllByTestId('file-library-row')).toHaveLength(4);
  });

  it('shows an empty state for a new library', () => {
    filesState.files = [];
    renderMenu();
    expect(screen.getByTestId('file-library-empty')).toHaveTextContent('chat.fileLibrary.empty');
  });

  it('shows a loading skeleton while files load', () => {
    filesState.files = [];
    filesState.isLoading = true;
    renderMenu();
    expect(screen.getByTestId('file-library-loading')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an alert when the list cannot load', () => {
    filesState.files = [];
    filesState.isError = true;
    renderMenu();
    expect(screen.getByRole('alert')).toHaveTextContent('chat.fileLibrary.loadError');
  });

  it('draws a real thumbnail for an image and a type icon for a document', () => {
    filesState.files = [
      makeLibraryFile({ id: 'img', filename: 'cat.png', mimeType: 'image/png' }),
      makeLibraryFile({ id: 'doc', filename: 'plan.pdf' }),
    ];
    renderMenu();

    const [imageRow, docRow] = screen.getAllByTestId('file-library-row');
    expect(imageRow?.querySelector('img')).toHaveAttribute('src', 'blob:img');
    expect(docRow?.querySelector('img')).toBeNull();
  });

  it('shows a status word only for a file that is not ready yet', () => {
    filesState.files = [
      makeLibraryFile({ id: 'busy', ingestionStatus: FileIngestionStatus.PROCESSING }),
      makeLibraryFile({ id: 'ready', filename: 'ready.pdf' }),
    ];
    renderMenu();

    const [busy, ready] = screen.getAllByTestId('file-library-row');
    expect(busy).toHaveTextContent('files.statusProcessing');
    expect(ready).not.toHaveTextContent('files.status');
  });
});

describe('FileLibraryMenu selection', () => {
  it('checks a file on click and unchecks it again', async () => {
    const [onChange] = renderMenu({ selectedFileIds: ['file-9'] });

    const picked = screen.getByRole('checkbox', { name: /doc-9\.pdf/ });
    expect(picked).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(picked);
    expect(onChange).toHaveBeenLastCalledWith([]);

    await userEvent.click(screen.getByRole('checkbox', { name: /doc-8\.pdf/ }));
    expect(onChange).toHaveBeenLastCalledWith(['file-9', 'file-8']);
  });

  it('stops at the per-message cap: other files are disabled, selected ones stay removable', async () => {
    const ids = Array.from({ length: MAX_ATTACHMENTS_PER_MESSAGE }, (_, i) => `sel-${String(i)}`);
    filesState.files = [
      ...makeLibraryFiles(2),
      makeLibraryFile({ id: 'sel-0', filename: 'in.pdf' }),
    ];
    const [onChange] = renderMenu({ selectedFileIds: ids });

    expect(screen.getByRole('checkbox', { name: /doc-2\.pdf/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      `chat.fileLibrary.limitReached:${String(MAX_ATTACHMENTS_PER_MESSAGE)}`,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /in\.pdf/ }));
    expect(onChange).toHaveBeenCalledWith(ids.filter((id) => id !== 'sel-0'));
  });

  it('attaches an archive whole and opens its contents from the second button', async () => {
    filesState.files = [
      makeLibraryFile({
        id: 'zip-1',
        filename: 'bundle.zip',
        mimeType: 'application/zip',
        childCount: 4,
      }),
    ];
    const [onChange] = renderMenu();

    await userEvent.click(screen.getByRole('checkbox', { name: /bundle\.zip/ }));
    expect(onChange).toHaveBeenCalledWith(['zip-1']);

    await userEvent.click(screen.getByLabelText('chat.fileLibrary.archiveChoose:bundle.zip'));
    expect(screen.getByTestId('archive-dialog')).toHaveTextContent('bundle.zip');
  });

  it('offers no contents button for an archive with nothing extracted', () => {
    filesState.files = [
      makeLibraryFile({ id: 'zip-2', filename: 'empty.zip', mimeType: 'application/zip' }),
    ];
    renderMenu();
    expect(screen.queryByLabelText(/archiveChoose/)).toBeNull();
  });
});

describe('FileLibraryMenu upload', () => {
  it('opens the native file picker from the upload row', async () => {
    renderMenu();
    const input = screen.getByTestId('file-library-input') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');

    await userEvent.click(screen.getByText('chat.fileLibrary.upload'));

    expect(click).toHaveBeenCalledTimes(1);
  });

  it('sends chosen files through ingestFiles, then asks the host to close', () => {
    const [, ingestFiles, onDone] = renderMenu();
    const file = new File(['x'], 'a.txt', { type: 'text/plain' });

    fireEvent.change(screen.getByTestId('file-library-input'), { target: { files: [file] } });

    expect(ingestFiles).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('accepts files dropped on the menu', () => {
    const [, ingestFiles, onDone] = renderMenu();
    const file = new File(['x'], 'a.txt', { type: 'text/plain' });
    const menu = screen.getByTestId('file-library-menu');

    fireEvent.dragOver(menu);
    expect(screen.getByText('files.dropFileHere')).toBeInTheDocument();
    fireEvent.drop(menu, { dataTransfer: { files: [file] } });

    expect(ingestFiles).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('files.dropFileHere')).toBeNull();
  });

  it('disables the upload row and says so while an upload is running', () => {
    renderMenu({ isUploading: true });
    expect(screen.getByText('chat.fileLibrary.uploading').closest('button')).toBeDisabled();
  });
});

describe('FileLibraryMenu Browse all', () => {
  it('hands off to the host when it supplies onBrowseAll, which closes itself in that step', async () => {
    const onBrowseAll = vi.fn();
    const [, , onDone] = renderMenu({ onBrowseAll });

    await userEvent.click(screen.getByText('chat.fileLibrary.browseAll'));

    expect(onBrowseAll).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.queryByTestId('file-library-dialog')).toBeNull();
  });

  it('asks the hosting menu to close once its own dialog attaches', async () => {
    const [onChange, , onDone] = renderMenu();

    await userEvent.click(screen.getByText('chat.fileLibrary.browseAll'));
    await userEvent.click(await screen.findByText('chat.fileLibrary.dialog.done'));

    expect(onChange).toHaveBeenCalledWith([]);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('opens its own dialog (and keeps the menu open) when the host does not', async () => {
    const [, , onDone] = renderMenu();

    await userEvent.click(screen.getByText('chat.fileLibrary.browseAll'));

    expect(await screen.findByTestId('file-library-dialog')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('FileLibraryMenu keyboard', () => {
  it('moves from the search box down through the rows with the arrow keys', async () => {
    renderMenu();
    const search = screen.getByLabelText('chat.fileLibrary.searchLabel');
    search.focus();

    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(
      screen.getByText('chat.fileLibrary.upload').closest('button'),
    );
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: /doc-9\.pdf/ }));
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(document.activeElement).toBe(search);
  });

  it('toggles the focused row with Space', async () => {
    const [onChange] = renderMenu();
    screen.getByRole('checkbox', { name: /doc-9\.pdf/ }).focus();

    await userEvent.keyboard(' ');

    expect(onChange).toHaveBeenCalledWith(['file-9']);
  });

  it('lets typing, Tab and Escape reach the host untouched', () => {
    const onHostKeyDown = vi.fn();
    document.addEventListener('keydown', onHostKeyDown);
    renderMenu();
    const search = screen.getByLabelText('chat.fileLibrary.searchLabel');

    fireEvent.keyDown(search, { key: 'd' });
    fireEvent.keyDown(search, { key: 'Tab' });
    fireEvent.keyDown(search, { key: 'Escape' });

    expect(onHostKeyDown).toHaveBeenCalledTimes(3);
    document.removeEventListener('keydown', onHostKeyDown);
  });

  it('keeps arrows that move inside the library away from the host', () => {
    const onHostKeyDown = vi.fn();
    document.addEventListener('keydown', onHostKeyDown);
    renderMenu();
    const search = screen.getByLabelText('chat.fileLibrary.searchLabel');
    search.focus();

    fireEvent.keyDown(search, { key: 'ArrowDown' });

    expect(onHostKeyDown).not.toHaveBeenCalled();
    document.removeEventListener('keydown', onHostKeyDown);
  });

  it('lets ArrowUp on the first element and ArrowDown on the last bubble up to the host', () => {
    const onHostKeyDown = vi.fn();
    document.addEventListener('keydown', onHostKeyDown);
    renderMenu();
    const search = screen.getByLabelText('chat.fileLibrary.searchLabel');
    search.focus();
    fireEvent.keyDown(search, { key: 'ArrowUp' });

    const browseAll = screen.getByText('chat.fileLibrary.browseAll').closest('button');
    browseAll?.focus();
    fireEvent.keyDown(browseAll as HTMLElement, { key: 'ArrowDown' });

    expect(onHostKeyDown).toHaveBeenCalledTimes(2);
    document.removeEventListener('keydown', onHostKeyDown);
  });

  it('is a full-width block: the host sets the width, not the menu', () => {
    renderMenu();
    const menu = screen.getByTestId('file-library-menu');
    expect(menu.className).toMatch(/(^| )w-full( |$)/);
    expect(menu.className).not.toMatch(/22rem/);
  });

  it('does not focus the search box on its own, so a phone keeps its keyboard down', () => {
    renderMenu();
    expect(screen.getByLabelText('chat.fileLibrary.searchLabel')).not.toHaveFocus();
  });
});
