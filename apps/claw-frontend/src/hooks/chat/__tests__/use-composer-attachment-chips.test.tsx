import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileIngestionStatus } from '@/enums/file-ingestion-status.enum';
import { useComposerAttachmentChips } from '@/hooks/chat/use-composer-attachment-chips';
import { queryKeys } from '@/repositories/shared/query-keys';

const { mockCancelProcessing, mockFiles } = vi.hoisted(() => ({
  mockCancelProcessing: vi.fn(),
  mockFiles: vi.fn(),
}));

vi.mock('@/repositories/files/files.repository', () => ({
  filesRepository: { cancelProcessing: mockCancelProcessing },
}));
vi.mock('@/hooks/files/use-files', () => ({
  useFiles: () => ({ files: mockFiles() }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${Object.values(params).join(',')}`,
  }),
}));

const VIDEO = {
  id: 'video-1',
  filename: 'clip.mp4',
  mimeType: 'video/mp4',
  ingestionStatus: FileIngestionStatus.PROCESSING,
  extractionError: null,
};
const PDF = {
  id: 'pdf-1',
  filename: 'contract.pdf',
  mimeType: 'application/pdf',
  ingestionStatus: FileIngestionStatus.PROCESSING,
  extractionError: null,
};

function setup(): {
  client: QueryClient;
  wrapper: (props: { children: ReactNode }) => React.ReactElement;
} {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  };
}

function params() {
  return {
    selectedFileIds: ['video-1', 'pdf-1'],
    onSelectedFileIdsChange: vi.fn(),
    uploads: [],
    onDismissUpload: vi.fn(),
  };
}

describe('useComposerAttachmentChips — Stop processing (pack §72)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFiles.mockReturnValue([VIDEO, PDF]);
    mockCancelProcessing.mockResolvedValue({
      fileId: 'video-1',
      ingestionStatus: FileIngestionStatus.FAILED,
      cancelled: true,
    });
  });

  it('offers Stop for the processing video only, named for the file', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useComposerAttachmentChips(params()), { wrapper });

    const cancels = result.current.processingCancelByFileId;
    expect([...cancels.keys()]).toEqual(['video-1']);
    expect(cancels.get('video-1')).toMatchObject({
      label: 'mediaUi.attachmentState.cancelProcessing',
      ariaLabel: 'mediaUi.attachmentState.cancelProcessingAria:clip.mp4',
      isCancelling: false,
    });
  });

  it('stops once, keeps the file attached, and refetches the file list', async () => {
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const input = params();
    const { result } = renderHook(() => useComposerAttachmentChips(input), { wrapper });

    act(() => {
      result.current.processingCancelByFileId.get('video-1')?.onCancel();
    });

    await waitFor(() => expect(mockCancelProcessing).toHaveBeenCalledWith('video-1'));
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.files.lists() }),
    );
    expect(mockCancelProcessing).toHaveBeenCalledTimes(1);
    expect(input.onSelectedFileIdsChange).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(result.current.processingCancelByFileId.get('video-1')?.isCancelling).toBe(false),
    );
  });

  it('a refused stop is logged, re-enables the action and still refetches', async () => {
    mockCancelProcessing.mockRejectedValue(new Error('404'));
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useComposerAttachmentChips(params()), { wrapper });

    act(() => {
      result.current.processingCancelByFileId.get('video-1')?.onCancel();
    });

    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(result.current.processingCancelByFileId.get('video-1')?.isCancelling).toBe(false);
  });
});
