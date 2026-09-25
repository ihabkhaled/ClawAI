import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FileViewerModal } from '@/components/file-viewer/file-viewer-modal';
import { FileViewerRenderKind } from '@/enums/file-viewer-render-kind.enum';
import type { FileViewerModalProps } from '@/types/file-viewer.types';

// The inline PDF was an <iframe src="blob:…">. frame-src has no blob: (and
// object-src stays 'none'), so the browser blocked it and the dialog showed an
// empty, broken frame. A PDF now opens in the browser's own viewer in a new tab.

const LABELS: FileViewerModalProps['labels'] = {
  loading: 'loading',
  error: 'error',
  unsupported: 'unsupported',
  download: 'download',
  close: 'close',
  pdfOpensInNewTab: 'pdf-opens-in-new-tab',
  openInNewTab: 'open-in-new-tab',
};

function renderModal(renderKind: FileViewerRenderKind, onOpenInNewTab = vi.fn()) {
  const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
  render(
    <FileViewerModal
      openObjectId="obj-1"
      title="report.pdf"
      content={{
        blob,
        blobUrl: 'blob:mock-object',
        mimeType: 'application/pdf',
        filename: 'report.pdf',
        sizeBytes: blob.size,
      }}
      textPreview={null}
      renderKind={renderKind}
      isLoading={false}
      error={null}
      onClose={vi.fn()}
      onOpenInNewTab={onOpenInNewTab}
      labels={LABELS}
    />,
  );
  return onOpenInNewTab;
}

describe('FileViewerModal — PDF', () => {
  it('never frames or embeds the blob: URL', () => {
    renderModal(FileViewerRenderKind.PDF);

    expect(document.querySelector('iframe')).toBeNull();
    expect(document.querySelector('object')).toBeNull();
    expect(document.querySelector('embed')).toBeNull();
  });

  it('says why and offers Open in new tab next to Download', () => {
    const onOpenInNewTab = renderModal(FileViewerRenderKind.PDF);

    expect(screen.getByText('pdf-opens-in-new-tab')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'download' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'open-in-new-tab' }));
    expect(onOpenInNewTab).toHaveBeenCalledTimes(1);
  });

  it('offers no new-tab button for a file it previews inline', () => {
    renderModal(FileViewerRenderKind.TEXT);

    expect(screen.queryByRole('button', { name: 'open-in-new-tab' })).toBeNull();
  });
});
