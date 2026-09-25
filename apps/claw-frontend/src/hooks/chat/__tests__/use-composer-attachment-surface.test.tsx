import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import { FileIngestionStatus } from '@/enums/file-ingestion-status.enum';
import { useComposerAttachmentSurface } from '@/hooks/chat/use-composer-attachment-surface';
import type { ComposerAttachmentSurfaceSource } from '@/types/hook.types';

// The ONE per-attachment implementation every composer uses (chat, Compare,
// in-thread Compare, the labs). These assert the split it makes: a selected
// file is a tray tile carrying its state line and Stop action; an upload that
// never got an id is a chip; a file still uploading is cancellable.

const { mockFiles } = vi.hoisted(() => ({ mockFiles: vi.fn() }));

vi.mock('@/repositories/files/files.repository', () => ({
  filesRepository: { cancelProcessing: vi.fn() },
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

function wrapper({ children }: { children: ReactNode }): React.ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

function source(overrides: Partial<ComposerAttachmentSurfaceSource> = {}) {
  return {
    pendingUploads: [],
    progress: null,
    removeAttachment: vi.fn(),
    uploads: [],
    dismissUpload: vi.fn(),
    ...overrides,
  };
}

describe('useComposerAttachmentSurface', () => {
  beforeEach(() => {
    mockFiles.mockReturnValue([
      {
        id: 'video-1',
        filename: 'clip.mp4',
        mimeType: 'video/mp4',
        ingestionStatus: FileIngestionStatus.PROCESSING,
        extractionError: null,
      },
    ]);
  });

  it('gives a processing video its state line and Stop action in the tray', () => {
    const { result } = renderHook(
      () =>
        useComposerAttachmentSurface({
          selectedFileIds: ['video-1'],
          onSelectedFileIdsChange: vi.fn(),
          attachments: source(),
        }),
      { wrapper },
    );

    const tray = result.current.attachmentTray;
    expect(tray.fileIds).toEqual(['video-1']);
    expect(tray.statusByFileId?.get('video-1')).toContain(' — ');
    expect(tray.processingCancelByFileId?.has('video-1')).toBe(true);
    // The selected file is NOT listed a second time as a chip.
    expect(result.current.attachmentChips.chips).toEqual([]);
  });

  it('lists a failed upload (no id) as a chip, and keeps a still-uploading one off the strip', () => {
    const { result } = renderHook(
      () =>
        useComposerAttachmentSurface({
          selectedFileIds: [],
          onSelectedFileIdsChange: vi.fn(),
          attachments: source({
            uploads: [
              {
                localId: 'upload-1',
                filename: 'broken.pdf',
                state: ComposerAttachmentState.Failed,
                fileId: null,
                reason: 'network error',
              },
              {
                localId: 'upload-2',
                filename: 'big.mp4',
                state: ComposerAttachmentState.Uploading,
                fileId: null,
                reason: null,
              },
            ],
          }),
        }),
      { wrapper },
    );

    const chips = result.current.attachmentChips.chips;
    expect(chips.map((chip) => chip.localId)).toEqual(['upload-1']);
    expect(chips[0]?.state).toBe(ComposerAttachmentState.Failed);
  });

  it('hands the pending tile the take-back action (abort + dismiss)', () => {
    const dismissUpload = vi.fn();
    const { result } = renderHook(
      () =>
        useComposerAttachmentSurface({
          selectedFileIds: [],
          onSelectedFileIdsChange: vi.fn(),
          attachments: source({ dismissUpload }),
          disabled: true,
        }),
      { wrapper },
    );

    act(() => result.current.attachmentTray.onCancelUpload?.('upload-3'));

    expect(dismissUpload).toHaveBeenCalledWith('upload-3');
    expect(result.current.attachmentTray.disabled).toBe(true);
  });
});
