import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FileLibraryDialog } from '@/components/chat/file-library-dialog';
import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/constants/composer-attachment.constants';
import { FILE_LIBRARY_LOCAL_PREVIEW_MAX_BYTES } from '@/constants/file-library.constants';
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

type Handlers = {
  onChange: ReturnType<typeof vi.fn>;
  ingestFiles: ReturnType<typeof vi.fn>;
  onOpenChange: ReturnType<typeof vi.fn>;
};

function dialogProps(
  overrides: Partial<React.ComponentProps<typeof FileLibraryDialog>> = {},
): React.ComponentProps<typeof FileLibraryDialog> & Handlers {
  return {
    open: true,
    onOpenChange: vi.fn(),
    selectedFileIds: [],
    onChange: vi.fn(),
    ingestFiles: vi.fn(),
    isUploading: false,
    ...overrides,
  } as React.ComponentProps<typeof FileLibraryDialog> & Handlers;
}

beforeEach(() => {
  filesState.files = [
    makeLibraryFile({
      id: 'img',
      filename: 'cat.png',
      mimeType: 'image/png',
      createdAt: '2026-10-03T00:00:00Z',
    }),
    makeLibraryFile({ id: 'doc', filename: 'plan.pdf', createdAt: '2026-10-02T00:00:00Z' }),
    makeLibraryFile({
      id: 'aud',
      filename: 'note.webm',
      mimeType: 'audio/webm',
      createdAt: '2026-10-01T00:00:00Z',
    }),
    makeLibraryFile({
      id: 'zip',
      filename: 'bundle.zip',
      mimeType: 'application/zip',
      childCount: 2,
      createdAt: '2026-09-30T00:00:00Z',
    }),
  ];
  filesState.isLoading = false;
  filesState.isError = false;
});
afterEach(() => window.localStorage.clear());

describe('FileLibraryDialog layout', () => {
  it('renders nothing while closed', () => {
    render(<FileLibraryDialog {...dialogProps({ open: false })} />);
    expect(screen.queryByTestId('file-library-dialog')).toBeNull();
  });

  it('lists every file as a grid tile by default, newest first', () => {
    render(<FileLibraryDialog {...dialogProps()} />);

    const tiles = screen.getAllByTestId('file-library-tile');
    expect(tiles).toHaveLength(4);
    expect(within(tiles[0] as HTMLElement).getByText('cat.png')).toBeInTheDocument();
  });

  it('switches to the list layout and remembers it for the next open', async () => {
    const { unmount } = render(<FileLibraryDialog {...dialogProps()} />);

    await userEvent.click(screen.getByLabelText('chat.fileLibrary.dialog.list'));
    expect(screen.getAllByTestId('file-library-row')).toHaveLength(4);
    expect(screen.queryByTestId('file-library-tile')).toBeNull();
    unmount();

    render(<FileLibraryDialog {...dialogProps()} />);
    expect(screen.getAllByTestId('file-library-row')).toHaveLength(4);
  });

  it('keeps the list region flexible and scrolling, never a viewport-height of its own', () => {
    render(<FileLibraryDialog {...dialogProps()} />);

    const region = screen.getByTestId('file-library-list-region');
    expect(region.className).toMatch(/\bflex-1\b/);
    expect(region.className).toMatch(/\bmin-h-0\b/);
    expect(region.className).toMatch(/\boverflow-auto\b/);
    expect(region.className).not.toMatch(/dvh|vh|h-\[/);
  });
});

describe('FileLibraryDialog filtering', () => {
  it('filters by type chip and marks the active chip as pressed', async () => {
    render(<FileLibraryDialog {...dialogProps()} />);

    await userEvent.click(screen.getByRole('button', { name: 'chat.fileLibrary.filters.images' }));

    expect(screen.getAllByTestId('file-library-tile')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'chat.fileLibrary.filters.images' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'chat.fileLibrary.filters.all' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('covers documents, audio and video, and archives', async () => {
    render(<FileLibraryDialog {...dialogProps()} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'chat.fileLibrary.filters.documents' }),
    );
    expect(screen.getByText('plan.pdf')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'chat.fileLibrary.filters.media' }));
    expect(screen.getByText('note.webm')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'chat.fileLibrary.filters.archives' }),
    );
    expect(screen.getByText('bundle.zip')).toBeInTheDocument();
    expect(screen.getAllByTestId('file-library-tile')).toHaveLength(1);
  });

  it('searches by name and explains an empty result', async () => {
    render(<FileLibraryDialog {...dialogProps()} />);
    const search = screen.getByLabelText('chat.fileLibrary.searchLabel');

    await userEvent.type(search, 'plan');
    expect(screen.getAllByTestId('file-library-tile')).toHaveLength(1);

    await userEvent.clear(search);
    await userEvent.type(search, 'nothing-like-this');
    expect(screen.getByTestId('file-library-empty')).toHaveTextContent(
      'chat.fileLibrary.noResults:nothing-like-this',
    );
  });

  it('says the filters hide everything when files exist but none match', async () => {
    filesState.files = [makeLibraryFile({ id: 'doc', filename: 'plan.pdf' })];
    render(<FileLibraryDialog {...dialogProps()} />);

    await userEvent.click(screen.getByRole('button', { name: 'chat.fileLibrary.filters.images' }));

    expect(screen.getByTestId('file-library-empty')).toHaveTextContent(
      'chat.fileLibrary.noMatches',
    );
  });

  it('shows the empty library, loading and error states', () => {
    filesState.files = [];
    const { rerender } = render(<FileLibraryDialog {...dialogProps()} />);
    expect(screen.getByTestId('file-library-empty')).toHaveTextContent('chat.fileLibrary.empty');

    filesState.isLoading = true;
    rerender(<FileLibraryDialog {...dialogProps()} />);
    expect(screen.getByTestId('file-library-loading')).toBeInTheDocument();

    filesState.isLoading = false;
    filesState.isError = true;
    rerender(<FileLibraryDialog {...dialogProps()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('chat.fileLibrary.loadError');
  });
});

describe('FileLibraryDialog selection', () => {
  it('starts from the composer attachments and counts the draft', () => {
    render(<FileLibraryDialog {...dialogProps({ selectedFileIds: ['doc'] })} />);

    expect(screen.getByText('chat.fileLibrary.dialog.selectedCount:1')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /plan\.pdf/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'chat.fileLibrary.dialog.attachCount:1' }),
    ).toBeInTheDocument();
  });

  it('keeps picks as a draft until Attach, then commits them and closes', async () => {
    const props = dialogProps();
    render(<FileLibraryDialog {...props} />);

    await userEvent.click(screen.getByRole('checkbox', { name: /cat\.png/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /plan\.pdf/ }));
    expect(props.onChange).not.toHaveBeenCalled();
    expect(screen.getByText('chat.fileLibrary.dialog.selectedCount:2')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'chat.fileLibrary.dialog.attachCount:2' }),
    );

    expect(props.onChange).toHaveBeenCalledWith(['img', 'doc']);
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('tells a hosting menu it is done after Attach, but not after Cancel', async () => {
    const onDone = vi.fn();
    const props = dialogProps({ onDone });
    render(<FileLibraryDialog {...props} />);

    await userEvent.click(screen.getByRole('button', { name: 'chat.fileLibrary.dialog.cancel' }));
    expect(onDone).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('checkbox', { name: /cat\.png/ }));
    await userEvent.click(
      screen.getByRole('button', { name: 'chat.fileLibrary.dialog.attachCount:1' }),
    );

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('keeps focus rings from being clipped by the scrolling list', () => {
    render(<FileLibraryDialog {...dialogProps()} />);

    expect(screen.getByTestId('file-library-list-region').className).toMatch(/\bpx-1\b/);
    expect(
      screen.getAllByTestId('file-library-tile')[0]?.querySelector('button')?.className,
    ).toMatch(/ring-inset/);
  });

  it('leaves the composer untouched on Cancel', async () => {
    const props = dialogProps({ selectedFileIds: ['doc'] });
    render(<FileLibraryDialog {...props} />);

    await userEvent.click(screen.getByRole('checkbox', { name: /cat\.png/ }));
    await userEvent.click(screen.getByRole('button', { name: 'chat.fileLibrary.dialog.cancel' }));

    expect(props.onChange).not.toHaveBeenCalled();
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('offers Done, committing an empty draft, when nothing is picked', async () => {
    const props = dialogProps({ selectedFileIds: ['doc'] });
    render(<FileLibraryDialog {...props} />);

    await userEvent.click(screen.getByRole('checkbox', { name: /plan\.pdf/ }));
    await userEvent.click(screen.getByRole('button', { name: 'chat.fileLibrary.dialog.done' }));

    expect(props.onChange).toHaveBeenCalledWith([]);
  });

  it('refuses an eleventh file but still lets a picked one be removed', async () => {
    const many = makeLibraryFiles(MAX_ATTACHMENTS_PER_MESSAGE + 2);
    filesState.files = many;
    const picked = many.slice(0, MAX_ATTACHMENTS_PER_MESSAGE).map((file) => file.id);
    render(<FileLibraryDialog {...dialogProps({ selectedFileIds: picked })} />);

    expect(screen.getByRole('checkbox', { name: /doc-12\.pdf/ })).toBeDisabled();
    expect(screen.getByText(/limitReached/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /doc-1\.pdf/ })).not.toBeDisabled();
  });

  it('folds a file that finishes uploading into the draft so Attach keeps it', async () => {
    const props = dialogProps({ selectedFileIds: ['doc'] });
    const { rerender } = render(<FileLibraryDialog {...props} />);

    rerender(<FileLibraryDialog {...props} selectedFileIds={['doc', 'fresh']} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'chat.fileLibrary.dialog.attachCount:2' }),
    );

    expect(props.onChange).toHaveBeenCalledWith(['doc', 'fresh']);
  });

  it('opens an archive contents picker from its tile', async () => {
    render(<FileLibraryDialog {...dialogProps()} />);

    await userEvent.click(screen.getByLabelText('chat.fileLibrary.archiveChoose:bundle.zip'));

    expect(screen.getByTestId('archive-dialog')).toHaveTextContent('bundle.zip');
  });

  it('toggles with the keyboard', async () => {
    render(<FileLibraryDialog {...dialogProps()} />);
    screen.getByRole('checkbox', { name: /cat\.png/ }).focus();

    await userEvent.keyboard('{Enter}');

    expect(screen.getByText('chat.fileLibrary.dialog.selectedCount:1')).toBeInTheDocument();
  });
});

describe('FileLibraryDialog upload', () => {
  let counter = 0;
  const createObjectURL = vi.fn(() => `blob:upload-${String(++counter)}`);
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    counter = 0;
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('opens the native picker from the drop area and sends choices through ingestFiles', async () => {
    const props = dialogProps();
    render(<FileLibraryDialog {...props} />);
    const input = screen.getByTestId('file-library-dialog-input') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');

    await userEvent.click(screen.getByTestId('file-library-dropzone'));
    expect(click).toHaveBeenCalledTimes(1);

    const file = new File(['x'], 'a.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(props.ingestFiles).toHaveBeenCalledTimes(1);
  });

  it('shows a local thumbnail for a dropped image while it uploads, then revokes it', () => {
    const props = dialogProps();
    const { rerender } = render(<FileLibraryDialog {...props} />);
    const zone = screen.getByTestId('file-library-dropzone');
    const image = new File([new Uint8Array(3)], 'shot.png', { type: 'image/png' });

    fireEvent.dragOver(zone);
    expect(screen.getByText('chat.fileLibrary.dialog.dropActive')).toBeInTheDocument();
    fireEvent.drop(zone, { dataTransfer: { files: [image] } });
    rerender(<FileLibraryDialog {...props} isUploading />);

    const tile = screen.getByTestId('file-library-upload-tile');
    expect(tile).toHaveTextContent('shot.png');
    expect(tile.querySelector('img')).toHaveAttribute('src', 'blob:upload-1');
    expect(props.ingestFiles).toHaveBeenCalledTimes(1);

    rerender(<FileLibraryDialog {...props} isUploading={false} />);
    expect(screen.queryByTestId('file-library-upload-tile')).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:upload-1');
  });

  it('draws the file mark when a dropped image will not decode (HEIC and friends)', () => {
    const props = dialogProps();
    const { rerender } = render(<FileLibraryDialog {...props} />);
    const heic = new File([new Uint8Array(3)], 'photo.heic', { type: 'image/heic' });

    fireEvent.drop(screen.getByTestId('file-library-list-region'), {
      dataTransfer: { files: [heic] },
    });
    rerender(<FileLibraryDialog {...props} isUploading />);
    const tile = screen.getByTestId('file-library-upload-tile');
    fireEvent.error(tile.querySelector('img') as HTMLElement);

    expect(tile.querySelector('img')).toBeNull();
    expect(tile.querySelector('svg')).not.toBeNull();
  });

  it('makes no preview URL for a huge dropped image', () => {
    const props = dialogProps();
    const { rerender } = render(<FileLibraryDialog {...props} />);
    const huge = new File([new Uint8Array(3)], 'big.png', { type: 'image/png' });
    Object.defineProperty(huge, 'size', { value: FILE_LIBRARY_LOCAL_PREVIEW_MAX_BYTES + 1 });

    fireEvent.drop(screen.getByTestId('file-library-list-region'), {
      dataTransfer: { files: [huge] },
    });
    rerender(<FileLibraryDialog {...props} isUploading />);

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByTestId('file-library-upload-tile').querySelector('img')).toBeNull();
  });

  it('shows a plain file mark, not a preview, for a non-image upload', () => {
    const props = dialogProps();
    const { rerender } = render(<FileLibraryDialog {...props} />);
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });

    fireEvent.drop(screen.getByTestId('file-library-list-region'), {
      dataTransfer: { files: [pdf] },
    });
    rerender(<FileLibraryDialog {...props} isUploading />);

    expect(screen.getByTestId('file-library-upload-tile').querySelector('img')).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('disables the drop area while an upload is already running', () => {
    render(<FileLibraryDialog {...dialogProps({ isUploading: true })} />);
    expect(screen.getByTestId('file-library-dropzone')).toBeDisabled();
  });
});
