import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FileViewerRenderKind } from '@/enums/file-viewer-render-kind.enum';
import { useFileViewer } from '@/hooks/file-viewer/use-file-viewer';
import type { WorkspaceObjectContent } from '@/types/file-viewer.types';

const mockFetchContent = vi.fn<(objectId: string) => Promise<WorkspaceObjectContent>>();

vi.mock('@/repositories/workspace/workspace-object-content.repository', () => ({
  fetchWorkspaceObjectContent: (objectId: string) => mockFetchContent(objectId),
}));

function contentOf(text: string, mimeType: string): WorkspaceObjectContent {
  const blob = new Blob([text], { type: mimeType });
  return {
    blob,
    blobUrl: 'blob:mock-object',
    mimeType,
    filename: 'notes.txt',
    sizeBytes: blob.size,
  };
}

describe('useFileViewer', () => {
  beforeEach(() => {
    mockFetchContent.mockReset();
    vi.stubGlobal('URL', { ...URL, revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds the text preview from the Blob, never by fetching its own blob: URL', async () => {
    // fetch(blob:) is a connect-src request; the CSP has no blob: there, so
    // the old path threw and the viewer showed an error for every text file.
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    mockFetchContent.mockResolvedValue(contentOf('hello from the workspace', 'text/plain'));

    const { result } = renderHook(() => useFileViewer());
    act(() => {
      result.current.open('obj-1', 'notes.txt');
    });

    await waitFor(() => expect(result.current.textPreview).toBe('hello from the workspace'));
    expect(result.current.renderKind).toBe(FileViewerRenderKind.TEXT);
    expect(result.current.error).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not read a text preview for a PDF', async () => {
    mockFetchContent.mockResolvedValue(contentOf('%PDF-1.4', 'application/pdf'));

    const { result } = renderHook(() => useFileViewer());
    act(() => {
      result.current.open('obj-2', 'report.pdf');
    });

    await waitFor(() => expect(result.current.content).not.toBeNull());
    expect(result.current.textPreview).toBeNull();
    expect(result.current.renderKind).toBe(FileViewerRenderKind.PDF);
  });
});
