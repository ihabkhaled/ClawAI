import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AttachmentPreviewKind } from '@/enums/attachment-preview-kind.enum';
import { useAttachmentFilePreview } from '@/hooks/chat/use-attachment-file-preview';

let mockBlobUrl: string | null;
let mockBlob: Blob | null;
const mockLoad = vi.fn(() => {
  mockBlobUrl = 'blob:mock-file';
});
const mockOpenBlobInNewTab = vi.fn();
const mockTriggerBrowserDownload = vi.fn();

vi.mock('@/hooks/chat/use-authenticated-file-blob', () => ({
  useAuthenticatedFileBlob: () => ({
    blobUrl: mockBlobUrl,
    blob: mockBlob,
    isLoading: false,
    error: null,
    load: mockLoad,
  }),
}));
vi.mock('@/utilities/download-blob.utility', () => ({
  openBlobInNewTab: (...args: unknown[]) => mockOpenBlobInNewTab(...args),
  triggerBrowserDownload: (...args: unknown[]) => mockTriggerBrowserDownload(...args),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

describe('useAttachmentFilePreview', () => {
  beforeEach(() => {
    mockBlobUrl = null;
    mockBlob = null;
    mockLoad.mockClear();
    mockOpenBlobInNewTab.mockClear();
    mockTriggerBrowserDownload.mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // The blob is fetched lazily; view()/download() must still "just work" on
  // the first click even though the bytes are not there yet — the action is
  // deferred and fires once load() resolves, not silently dropped.
  it('view() on a PDF opens the native viewer once the blob finishes loading', async () => {
    const { result, rerender } = renderHook(() =>
      useAttachmentFilePreview('f1', 'report.pdf', AttachmentPreviewKind.Pdf),
    );

    act(() => {
      result.current.view();
    });
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockOpenBlobInNewTab).not.toHaveBeenCalled();

    rerender();
    await waitFor(() => expect(mockOpenBlobInNewTab).toHaveBeenCalledWith('blob:mock-file'));
  });

  it('view() opens immediately when the blob is already loaded', () => {
    mockBlobUrl = 'blob:already-there';

    const { result } = renderHook(() =>
      useAttachmentFilePreview('f1', 'report.pdf', AttachmentPreviewKind.Pdf),
    );

    act(() => {
      result.current.view();
    });

    expect(mockOpenBlobInNewTab).toHaveBeenCalledWith('blob:already-there');
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('download() triggers a real download rather than opening a viewer, for a generic file', () => {
    mockBlobUrl = 'blob:already-there';

    const { result } = renderHook(() =>
      useAttachmentFilePreview(
        'f1',
        'plan.docx',
        AttachmentPreviewKind.Generic,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    );

    act(() => {
      result.current.download();
    });

    // The MIME type is forwarded so the saved file keeps its real extension.
    expect(mockTriggerBrowserDownload).toHaveBeenCalledWith(
      'blob:already-there',
      'plan.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(mockOpenBlobInNewTab).not.toHaveBeenCalled();
  });

  it('loads and truncates a text-like preview once the blob resolves', async () => {
    mockBlobUrl = 'blob:text-file';
    const longText = 'x'.repeat(2000);
    mockBlob = new Blob([longText], { type: 'text/plain' });
    // The preview reads the Blob itself. fetch(blob:) is a connect-src request
    // and the CSP (rightly) has no blob: there, so it failed in every browser.
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() =>
      useAttachmentFilePreview('f1', 'notes.txt', AttachmentPreviewKind.Text),
    );

    await waitFor(() => expect(result.current.previewText).not.toBeNull());
    expect(result.current.previewText?.length).toBe(800);
    expect(result.current.isPreviewTruncated).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not attempt a text preview for a PDF or generic file', () => {
    mockBlobUrl = 'blob:pdf-file';
    mockBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useAttachmentFilePreview('f1', 'report.pdf', AttachmentPreviewKind.Pdf));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
