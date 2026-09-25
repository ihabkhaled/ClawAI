import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import { FileIngestionStatus } from '@/enums/file-ingestion-status.enum';
import { useOrchestrationComposer } from '@/hooks/chat/use-orchestration-composer';

// The nine orchestration labs share this hook (via OrchestrationPageShell).
// They used to get a count + progress bar; they now get the chat composer's
// per-attachment tray + chips from the same surface hook.

const { mockUpload, mockFiles } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockFiles: vi.fn(),
}));

vi.mock('@/hooks/files/use-chunked-upload', () => ({
  useChunkedUpload: () => ({ upload: mockUpload, progress: null, isUploading: false, error: null }),
}));
vi.mock('@/hooks/files/use-files', () => ({
  useFiles: () => ({ files: mockFiles() }),
}));
vi.mock('@/repositories/files/files.repository', () => ({
  filesRepository: { cancelProcessing: vi.fn() },
}));
vi.mock('@/hooks/research/use-research-providers', () => ({
  useResearchProviders: () => ({ providers: [], isLoading: false }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/utilities', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  showToast: { success: vi.fn(), error: vi.fn(), apiError: vi.fn() },
}));

function wrapper({ children }: PropsWithChildren): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe('useOrchestrationComposer — per-attachment status (same as chat)', () => {
  beforeEach(() => {
    mockUpload.mockReset();
    mockFiles.mockReturnValue([]);
  });

  it('refuses a file the client cannot send as a Not supported chip, without uploading it', async () => {
    const { result } = renderHook(() => useOrchestrationComposer(), { wrapper });

    // Empty: refused by uploadFileSchema before any request.
    act(() => result.current.ingestFiles([new File([], 'empty.txt', { type: 'text/plain' })]));

    await waitFor(() => expect(result.current.attachmentChips.chips).toHaveLength(1));
    expect(result.current.attachmentChips.chips[0]?.state).toBe(
      ComposerAttachmentState.Unsupported,
    );
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('shows a processing video with its state line and Stop action', async () => {
    mockUpload.mockResolvedValue('video-9');
    mockFiles.mockReturnValue([
      {
        id: 'video-9',
        filename: 'demo.mp4',
        mimeType: 'video/mp4',
        ingestionStatus: FileIngestionStatus.PROCESSING,
        extractionError: null,
      },
    ]);
    const { result } = renderHook(() => useOrchestrationComposer(), { wrapper });

    act(() =>
      result.current.ingestFiles([
        new File([new Uint8Array(4)], 'demo.mp4', { type: 'video/mp4' }),
      ]),
    );

    await waitFor(() => expect(result.current.attachmentTray.fileIds).toEqual(['video-9']));
    expect(result.current.attachmentTray.statusByFileId?.has('video-9')).toBe(true);
    expect(result.current.attachmentTray.processingCancelByFileId?.has('video-9')).toBe(true);
  });

  it('removing a failed chip drops it', async () => {
    mockUpload.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useOrchestrationComposer(), { wrapper });

    act(() =>
      result.current.ingestFiles([
        new File([new Uint8Array(4)], 'notes.pdf', { type: 'application/pdf' }),
      ]),
    );
    await waitFor(() => expect(result.current.attachmentChips.chips).toHaveLength(1));
    const chip = result.current.attachmentChips.chips[0];
    expect(chip?.state).toBe(ComposerAttachmentState.Failed);

    act(() => {
      if (chip !== undefined) {
        result.current.attachmentChips.onRemove(chip);
      }
    });

    await waitFor(() => expect(result.current.attachmentChips.chips).toEqual([]));
  });
});
