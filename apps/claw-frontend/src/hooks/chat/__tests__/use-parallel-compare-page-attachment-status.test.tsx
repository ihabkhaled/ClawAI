import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import { FileIngestionStatus } from '@/enums/file-ingestion-status.enum';
import { useParallelComparePage } from '@/hooks/chat/use-parallel-compare-page';

// Compare used to show a paperclip count and a progress bar only. It now
// renders the SAME per-attachment tray + chips as the chat composer, through
// the same hook; these drive the real Compare hook end to end.

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
vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: { sendParallel: vi.fn() },
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/hooks/chat/use-judge-model-options', () => ({
  useJudgeModelOptions: () => ({ options: [], isLoading: false }),
}));
vi.mock('@/hooks/chat/use-parallel-poll', () => ({
  useParallelPoll: () => ({
    pollingMessages: [],
    isPolling: false,
    allResponded: false,
    isParallelError: false,
    handleViewInThread: () => undefined,
  }),
}));
vi.mock('@/hooks/chat/use-parallel-stream', () => ({
  useParallelStream: () => ({ lanes: {} }),
}));
vi.mock('@/hooks/research/use-research-providers', () => ({
  useResearchProviders: () => ({ providers: [], isLoading: false }),
}));
vi.mock('@/utilities', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  showToast: { success: vi.fn(), error: vi.fn(), apiError: vi.fn() },
}));

function wrapper({ children }: PropsWithChildren): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

function pdf(name = 'report.pdf'): File {
  return new File([new Uint8Array(4)], name, { type: 'application/pdf' });
}

describe('useParallelComparePage — per-attachment status (same as chat)', () => {
  beforeEach(() => {
    mockUpload.mockReset();
    mockFiles.mockReturnValue([]);
  });

  it('shows a failed upload as a chip with its state instead of a bare count', async () => {
    mockUpload.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });

    act(() => result.current.ingestFiles([pdf()]));

    await waitFor(() => expect(result.current.attachmentChips.chips).toHaveLength(1));
    const chip = result.current.attachmentChips.chips[0];
    expect(chip?.state).toBe(ComposerAttachmentState.Failed);
    expect(chip?.displayName).toBe('report.pdf');
  });

  it('gives a selected video still processing its state line and Stop action', async () => {
    mockUpload.mockResolvedValue('video-1');
    mockFiles.mockReturnValue([
      {
        id: 'video-1',
        filename: 'clip.mp4',
        mimeType: 'video/mp4',
        ingestionStatus: FileIngestionStatus.PROCESSING,
        extractionError: null,
      },
    ]);
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });

    act(() =>
      result.current.ingestFiles([
        new File([new Uint8Array(4)], 'clip.mp4', { type: 'video/mp4' }),
      ]),
    );

    await waitFor(() => expect(result.current.attachmentTray.fileIds).toEqual(['video-1']));
    expect(result.current.attachmentTray.statusByFileId?.has('video-1')).toBe(true);
    expect(result.current.attachmentTray.processingCancelByFileId?.has('video-1')).toBe(true);
  });

  it('cancelling a file still uploading aborts it and leaves no chip behind', async () => {
    let seenSignal: AbortSignal | undefined;
    mockUpload.mockImplementation(
      (_file: File, options?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          seenSignal = options?.signal;
          options?.signal?.addEventListener('abort', () => reject(new Error('Upload aborted')));
        }),
    );
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });

    act(() => result.current.ingestFiles([pdf('big.pdf')]));
    await waitFor(() => expect(result.current.attachmentTray.pendingUploads).toHaveLength(1));
    const key = result.current.attachmentTray.pendingUploads[0]?.key ?? '';

    act(() => result.current.attachmentTray.onCancelUpload?.(key));

    expect(seenSignal?.aborted).toBe(true);
    await waitFor(() => expect(result.current.attachmentTray.pendingUploads).toHaveLength(0));
    expect(result.current.attachmentChips.chips).toEqual([]);
    expect(result.current.canSend).toBe(false);
  });
});
