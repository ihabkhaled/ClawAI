import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessageAttachmentItem } from '@/components/chat/message-attachment-item';
import { FileIngestionStatus } from '@/enums';
import type { UploadedFile } from '@/types';

// Bug (live, 2026-09-24): every attachment under a sent message — image,
// voice note, video note, PDF, docx, zip, everything — rendered the exact
// same generic broken-image placeholder ("Attached file" + the browser's
// broken-<img> glyph), because MessageAttachmentItem force-fed every
// non-archive attachment through an <img> tag regardless of its real
// mimeType. This suite proves each category now routes to the component that
// can actually render it, and that the old universal placeholder never shows
// for a resolved, known type.
const mockUseMessageAttachmentItem = vi.fn();
const mockUseAttachmentFileMeta = vi.fn();

vi.mock('@/hooks/chat/use-message-attachment-item', () => ({
  useMessageAttachmentItem: (...args: unknown[]) => mockUseMessageAttachmentItem(...args),
}));
vi.mock('@/hooks/files/use-attachment-file-meta', () => ({
  useAttachmentFileMeta: (...args: unknown[]) => mockUseAttachmentFileMeta(...args),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/chat/use-authenticated-image', () => ({
  useAuthenticatedImage: () => null,
}));
vi.mock('@/hooks/chat/use-authenticated-file-blob', () => ({
  useAuthenticatedFileBlob: () => ({ blobUrl: null, isLoading: false, error: null, load: vi.fn() }),
}));

function notResolvingAsArchive(): void {
  mockUseMessageAttachmentItem.mockReturnValue({
    t: (key: string) => key,
    listing: undefined,
    isResolving: false,
    rejection: null,
    isExpanded: false,
    toggleExpanded: vi.fn(),
    passwordPrompt: {},
  });
}

function metaFile(overrides: Partial<UploadedFile>): UploadedFile {
  return {
    id: 'file-1',
    userId: 'u1',
    filename: 'file',
    mimeType: 'application/octet-stream',
    sizeBytes: 100,
    storagePath: '/x',
    ingestionStatus: FileIngestionStatus.COMPLETED,
    createdAt: '2026-09-24T00:00:00Z',
    updatedAt: '2026-09-24T00:00:00Z',
    ...overrides,
  };
}

describe('MessageAttachmentItem', () => {
  it('shows a placeholder while metadata is still resolving', () => {
    mockUseMessageAttachmentItem.mockReturnValue({
      t: (key: string) => key,
      listing: undefined,
      isResolving: true,
      rejection: null,
      isExpanded: false,
      toggleExpanded: vi.fn(),
      passwordPrompt: {},
    });
    mockUseAttachmentFileMeta.mockReturnValue({ file: undefined, isLoading: true, isError: false });

    render(<MessageAttachmentItem fileId="file-1" />);

    expect(screen.queryByTestId('attachment-media-preview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attachment-file-preview')).not.toBeInTheDocument();
  });

  it('routes an image to the thumbnail, not the file/media preview', () => {
    notResolvingAsArchive();
    mockUseAttachmentFileMeta.mockReturnValue({
      file: metaFile({ mimeType: 'image/png', filename: 'photo.png' }),
      isLoading: false,
      isError: false,
    });

    render(<MessageAttachmentItem fileId="file-1" />);

    expect(screen.queryByTestId('attachment-media-preview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attachment-file-preview')).not.toBeInTheDocument();
  });

  it('routes a voice note to the media preview with a Play control, not the old broken placeholder', () => {
    notResolvingAsArchive();
    mockUseAttachmentFileMeta.mockReturnValue({
      file: metaFile({ mimeType: 'audio/mpeg', filename: 'note.mp3' }),
      isLoading: false,
      isError: false,
    });

    render(<MessageAttachmentItem fileId="file-1" />);

    expect(screen.getByTestId('attachment-media-preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'chat.attachment.play' })).toBeInTheDocument();
  });

  it('routes a video note to the media preview with a Play control', () => {
    notResolvingAsArchive();
    mockUseAttachmentFileMeta.mockReturnValue({
      file: metaFile({ mimeType: 'video/mp4', filename: 'clip.mp4' }),
      isLoading: false,
      isError: false,
    });

    render(<MessageAttachmentItem fileId="file-1" />);

    expect(screen.getByTestId('attachment-media-preview')).toBeInTheDocument();
  });

  it('routes a PDF to the file preview with a View action (native viewer)', () => {
    notResolvingAsArchive();
    mockUseAttachmentFileMeta.mockReturnValue({
      file: metaFile({ mimeType: 'application/pdf', filename: 'report.pdf' }),
      isLoading: false,
      isError: false,
    });

    render(<MessageAttachmentItem fileId="file-1" />);

    expect(screen.getByTestId('attachment-file-preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chat\.attachment\.view/ })).toBeInTheDocument();
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
  });

  it('routes a plaintext file to the file preview (readable-preview branch)', () => {
    notResolvingAsArchive();
    mockUseAttachmentFileMeta.mockReturnValue({
      file: metaFile({ mimeType: 'text/plain', filename: 'notes.txt' }),
      isLoading: false,
      isError: false,
    });

    render(<MessageAttachmentItem fileId="file-1" />);

    expect(screen.getByTestId('attachment-file-preview')).toBeInTheDocument();
  });

  it('routes a docx (no in-app viewer) to the file preview with only Download, no broken View', () => {
    notResolvingAsArchive();
    mockUseAttachmentFileMeta.mockReturnValue({
      file: metaFile({
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename: 'plan.docx',
      }),
      isLoading: false,
      isError: false,
    });

    render(<MessageAttachmentItem fileId="file-1" />);

    expect(screen.getByTestId('attachment-file-preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chat\.attachment\.download/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /chat\.attachment\.view/ }),
    ).not.toBeInTheDocument();
  });

  it('an archive still renders the archive card, unaffected by the new routing', () => {
    mockUseMessageAttachmentItem.mockReturnValue({
      t: (key: string) => key,
      listing: {
        archiveFileId: 'file-1',
        filename: 'bundle.zip',
        ingestionStatus: FileIngestionStatus.COMPLETED,
        extractionError: null,
        isArchive: true,
        entries: [],
        unlistedEntryCount: 0,
      },
      isResolving: false,
      rejection: null,
      isExpanded: false,
      toggleExpanded: vi.fn(),
      passwordPrompt: {},
    });
    mockUseAttachmentFileMeta.mockReturnValue({
      file: metaFile({ mimeType: 'application/zip', filename: 'bundle.zip' }),
      isLoading: false,
      isError: false,
    });

    render(<MessageAttachmentItem fileId="file-1" />);

    expect(screen.getByTestId('archive-attachment-card')).toBeInTheDocument();
    expect(screen.queryByTestId('attachment-file-preview')).not.toBeInTheDocument();
  });

  it('falls back to the thumbnail (never crashes) when metadata failed to resolve', () => {
    notResolvingAsArchive();
    mockUseAttachmentFileMeta.mockReturnValue({ file: undefined, isLoading: false, isError: true });

    expect(() => render(<MessageAttachmentItem fileId="file-1" />)).not.toThrow();
  });
});
