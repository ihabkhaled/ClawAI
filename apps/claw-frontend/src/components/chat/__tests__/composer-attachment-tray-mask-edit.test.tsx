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
      filename: fileId === 'img-1' ? 'cat.png' : 'contract.pdf',
      mimeType: fileId === 'img-1' ? 'image/png' : 'application/pdf',
      sizeBytes: 2048,
    },
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('@/components/chat/attachment-thumbnail', () => ({
  AttachmentThumbnail: ({ filename }: { filename: string }) => (
    <div data-testid="thumbnail">{filename}</div>
  ),
}));

function renderTray(maskedFileId: string | null) {
  const maskEdit = { maskedFileId, onOpen: vi.fn(), onClear: vi.fn() };
  render(
    <ComposerAttachmentTray
      fileIds={['img-1', 'pdf-1']}
      pendingUploads={[]}
      progress={null}
      onRemove={vi.fn()}
      maskEdit={maskEdit}
    />,
  );
  return maskEdit;
}

describe('ComposerAttachmentTray — Mask edit', () => {
  it('offers Mask edit on an image only, and opens the editor for that image', () => {
    const maskEdit = renderTray(null);

    const buttons = screen.getAllByTestId('composer-attachment-mask-edit');
    expect(buttons).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'chat.maskEdit.actionFor:cat.png' }));
    expect(maskEdit.onOpen).toHaveBeenCalledWith('img-1');
  });

  it('shows "Mask applied" with a way to take it back once a mask is drawn', () => {
    const maskEdit = renderTray('img-1');

    expect(screen.getByText('chat.maskEdit.applied')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('composer-attachment-mask-clear'));
    expect(maskEdit.onClear).toHaveBeenCalledTimes(1);
  });

  it('offers nothing on a surface that cannot send a mask', () => {
    render(
      <ComposerAttachmentTray
        fileIds={['img-1']}
        pendingUploads={[]}
        progress={null}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('composer-attachment-mask-edit')).not.toBeInTheDocument();
  });
});
