import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AttachmentThumbnail } from '@/components/chat/attachment-thumbnail';

let mockBlobState: { blobUrl: string | null; isLoading: boolean; error: Error | null };
const mockUseAuthenticatedFileBlob = vi.fn();

vi.mock('@/hooks/chat/use-authenticated-file-blob', () => ({
  useAuthenticatedFileBlob: (...args: unknown[]) => {
    mockUseAuthenticatedFileBlob(...args);
    return { ...mockBlobState, load: vi.fn() };
  },
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

describe('AttachmentThumbnail (image category)', () => {
  beforeEach(() => {
    mockBlobState = { blobUrl: null, isLoading: true, error: null };
    mockUseAuthenticatedFileBlob.mockClear();
  });

  it('fetches the authenticated download eagerly for this file', () => {
    render(<AttachmentThumbnail fileId="f1" />);

    expect(mockUseAuthenticatedFileBlob).toHaveBeenCalledWith('/api/v1/files/download/f1', true);
  });

  it('shows a real image thumbnail once the authenticated blob resolves', () => {
    mockBlobState = { blobUrl: 'blob:mock-photo', isLoading: false, error: null };

    render(<AttachmentThumbnail fileId="f1" filename="photo.jpg" />);

    const img = screen.getByRole('img', { name: 'photo.jpg' });
    expect(img).toHaveAttribute('src', 'blob:mock-photo');
    expect(img).toHaveClass('object-cover');
  });

  it('falls back to the generic label as alt text when the filename is unknown', () => {
    mockBlobState = { blobUrl: 'blob:mock-photo', isLoading: false, error: null };

    render(<AttachmentThumbnail fileId="f1" />);

    expect(screen.getByRole('img', { name: 'chat.attachedFile' })).toBeInTheDocument();
  });

  it('wraps the thumbnail in a link that opens the full image in a new tab', () => {
    mockBlobState = { blobUrl: 'blob:mock-photo', isLoading: false, error: null };

    render(<AttachmentThumbnail fileId="f1" />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'blob:mock-photo');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows a plain placeholder — not a broken image icon — while the blob has not resolved yet', () => {
    render(<AttachmentThumbnail fileId="f1" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attachment-unavailable')).not.toBeInTheDocument();
  });

  // Production: a file past retention (404), an expired session (401) or a
  // network error used to leave the tile stuck on a placeholder forever.
  it('degrades to an unavailable file card when the download fails (404/401/network)', () => {
    mockBlobState = { blobUrl: null, isLoading: false, error: new Error('404') };

    render(<AttachmentThumbnail fileId="f1" filename="old-photo.png" />);

    const card = screen.getByTestId('attachment-unavailable');
    expect(card).toHaveTextContent('old-photo.png');
    expect(card).toHaveTextContent('chat.attachment.unavailable');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  // Production: bytes arrived but the browser could not decode them (HEIC on
  // Chrome, an HTML error page served with 200, a truncated upload). That is
  // the broken-image glyph with alt "Attached file" users saw on claw-ai.co.
  it('swaps a broken <img> for the unavailable card when the image fails to decode', () => {
    mockBlobState = { blobUrl: 'blob:undecodable', isLoading: false, error: null };

    render(<AttachmentThumbnail fileId="f1" filename="IMG_0001.heic" />);

    fireEvent.error(screen.getByRole('img', { name: 'IMG_0001.heic' }));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const card = screen.getByTestId('attachment-unavailable');
    expect(card).toHaveTextContent('IMG_0001.heic');
    expect(card).toHaveTextContent('chat.attachment.unavailable');
  });

  it('labels the unavailable card generically when the filename is unknown', () => {
    mockBlobState = { blobUrl: null, isLoading: false, error: new Error('401') };

    render(<AttachmentThumbnail fileId="f1" />);

    expect(screen.getByTestId('attachment-unavailable')).toHaveTextContent('chat.attachedFile');
  });
});
