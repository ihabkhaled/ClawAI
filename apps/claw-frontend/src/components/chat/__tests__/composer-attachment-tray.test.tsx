import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ComposerAttachmentTray } from '@/components/chat/composer-attachment-tray';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${Object.values(params).join(',')}`,
  }),
}));
vi.mock('@/hooks/files/use-attachment-file-meta', () => ({
  useAttachmentFileMeta: (fileId: string) => ({
    file: {
      id: fileId,
      filename: fileId === 'pdf-1' ? 'contract.pdf' : 'note.webm',
      mimeType: fileId === 'pdf-1' ? 'application/pdf' : 'audio/webm',
      sizeBytes: 2048,
    },
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('@/components/chat/attachment-media-preview', () => ({
  AttachmentMediaPreview: ({ filename }: { filename: string }) => (
    <div data-testid="media-player">{filename}</div>
  ),
}));

describe('ComposerAttachmentTray', () => {
  it('renders nothing when nothing is attached', () => {
    const { container } = render(
      <ComposerAttachmentTray
        fileIds={[]}
        pendingUploads={[]}
        progress={null}
        onRemove={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a document as its name and size, and a voice note as a player', () => {
    render(
      <ComposerAttachmentTray
        fileIds={['pdf-1', 'voice-1']}
        pendingUploads={[]}
        progress={null}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText('contract.pdf')).toBeInTheDocument();
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    expect(screen.getByTestId('media-player')).toHaveTextContent('note.webm');
  });

  it('removes exactly the file whose (x) was pressed', () => {
    const onRemove = vi.fn();
    render(
      <ComposerAttachmentTray
        fileIds={['pdf-1', 'voice-1']}
        pendingUploads={[]}
        progress={null}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'chat.attachment.remove:contract.pdf' }));

    expect(onRemove).toHaveBeenCalledWith('pdf-1');
  });

  it('shows the state line of a selected file under its tile', () => {
    render(
      <ComposerAttachmentTray
        fileIds={['pdf-1']}
        pendingUploads={[]}
        progress={null}
        onRemove={vi.fn()}
        statusByFileId={new Map([['pdf-1', 'Processing — you can send now']])}
      />,
    );

    expect(screen.getByTestId('composer-attachment-status')).toHaveTextContent(
      'Processing — you can send now',
    );
  });

  it('shows an uploading file with its live percentage', () => {
    render(
      <ComposerAttachmentTray
        fileIds={[]}
        pendingUploads={[
          { key: 'p1', filename: 'big.mp4', mimeType: 'video/mp4', sizeBytes: 4096 },
        ]}
        progress={{
          percent: 42.4,
          bytesUploaded: 1700,
          totalBytes: 4096,
          bytesPerSecond: 1,
          etaSeconds: 3,
          elapsedSeconds: 1,
        }}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText('big.mp4')).toBeInTheDocument();
    expect(screen.getByText('42% · 4.0 KB')).toBeInTheDocument();
  });
});
