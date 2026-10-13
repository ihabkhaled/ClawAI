import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ComposerPendingAttachmentTile } from '@/components/chat/composer-pending-attachment-tile';
import { FILE_LIBRARY_LOCAL_PREVIEW_MAX_BYTES } from '@/constants/file-library.constants';
import type { PendingComposerUpload } from '@/types/composer-attachment.types';

function upload(overrides: Partial<PendingComposerUpload> = {}): PendingComposerUpload {
  return { key: 'u1', filename: 'shot.png', mimeType: 'image/png', sizeBytes: 3, ...overrides };
}

describe('ComposerPendingAttachmentTile', () => {
  let counter = 0;
  const createObjectURL = vi.fn(() => `blob:pending-${String(++counter)}`);
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    counter = 0;
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('previews an uploading image and revokes the preview when the tile goes', () => {
    const file = new File([new Uint8Array(3)], 'shot.png', { type: 'image/png' });
    const { unmount } = render(
      <ComposerPendingAttachmentTile
        upload={upload({ file })}
        progress={null}
        cancelLabel="Cancel"
      />,
    );

    expect(
      screen.getByTestId('composer-pending-attachment-preview').querySelector('img'),
    ).toHaveAttribute('src', 'blob:pending-1');
    expect(screen.getByText('shot.png')).toBeInTheDocument();

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:pending-1');
  });

  it('shows the spinner alone for a document, with no preview', () => {
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    render(
      <ComposerPendingAttachmentTile
        upload={upload({ filename: 'a.pdf', mimeType: 'application/pdf', file })}
        progress={null}
        cancelLabel="Cancel"
      />,
    );

    expect(screen.queryByTestId('composer-pending-attachment-preview')).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('still renders when the pipeline did not hand over the file', () => {
    render(
      <ComposerPendingAttachmentTile upload={upload()} progress={null} cancelLabel="Cancel" />,
    );
    expect(screen.queryByTestId('composer-pending-attachment-preview')).toBeNull();
    expect(screen.getByTestId('composer-pending-attachment-tile')).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('shows the live percentage and offers cancel', () => {
    const onCancel = vi.fn();
    render(
      <ComposerPendingAttachmentTile
        upload={upload()}
        progress={{
          percent: 41.6,
          bytesUploaded: 1,
          totalBytes: 3,
          bytesPerSecond: 1,
          etaSeconds: 1,
          elapsedSeconds: 1,
        }}
        onCancel={onCancel}
        cancelLabel="Cancel upload"
      />,
    );

    expect(screen.getByText(/42%/)).toBeInTheDocument();
    screen.getByLabelText('Cancel upload').click();
    expect(onCancel).toHaveBeenCalledWith('u1');
  });

  it('falls back to the type icon, still spinning, when the image will not decode', () => {
    const file = new File([new Uint8Array(3)], 'photo.heic', { type: 'image/heic' });
    render(
      <ComposerPendingAttachmentTile
        upload={upload({ filename: 'photo.heic', mimeType: 'image/heic', file })}
        progress={null}
        cancelLabel="Cancel"
      />,
    );

    fireEvent.error(
      screen.getByTestId('composer-pending-attachment-preview').querySelector('img') as HTMLElement,
    );

    expect(screen.queryByTestId('composer-pending-attachment-preview')).toBeNull();
    const icon = screen.getByTestId('composer-pending-attachment-icon');
    expect(icon.querySelectorAll('svg')).toHaveLength(2);
    expect(screen.getByTestId('composer-pending-attachment-tile')).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('shows the type icon, with no object URL, for an image past the decode cap', () => {
    const file = new File([new Uint8Array(3)], 'huge.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: FILE_LIBRARY_LOCAL_PREVIEW_MAX_BYTES + 1 });
    render(
      <ComposerPendingAttachmentTile
        upload={upload({ filename: 'huge.png', sizeBytes: file.size, file })}
        progress={null}
        cancelLabel="Cancel"
      />,
    );

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByTestId('composer-pending-attachment-icon')).toBeInTheDocument();
  });
});
