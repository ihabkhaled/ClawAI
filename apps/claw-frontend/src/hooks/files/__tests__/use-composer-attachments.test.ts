import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/constants/composer-attachment.constants';
import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import { useComposerAttachments } from '@/hooks/files/use-composer-attachments';
import { showToast } from '@/utilities';

const mockUpload = vi.fn();
let mockProgress: unknown = null;

// `useChunkedUpload` owns the single shared `progress`/`isUploading` state the
// composer renders from; this test exercises the REAL `useComposerAttachments`
// wiring around a controllable mock of it, so it can assert what a peer agent
// asked to verify directly: does `isUploading` (and therefore the send-guard
// in useMessageComposerState) actually return to false once an upload
// settles, success or failure alike — it must, or every later send in the
// same thread would be refused forever.
vi.mock('@/hooks/files/use-chunked-upload', () => ({
  useChunkedUpload: () => ({
    upload: (...args: unknown[]) => mockUpload(...args),
    get progress() {
      return mockProgress;
    },
    isUploading: false,
    error: null,
  }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));
vi.mock('@/utilities', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  showToast: { success: vi.fn(), error: vi.fn(), apiError: vi.fn() },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// The hook updates the selected list through a functional state update, so
// the sink applies updaters exactly like React's setState does.
function stateSink(initial: string[]): {
  onChange: Mock<React.Dispatch<React.SetStateAction<string[]>>>;
  value: () => string[];
} {
  let current = initial;
  const onChange = vi.fn<React.Dispatch<React.SetStateAction<string[]>>>((next) => {
    current = typeof next === 'function' ? next(current) : next;
  });
  return { onChange, value: () => current };
}

function pngFile(name = 'photo.png'): File {
  return new File([new Uint8Array(10)], name, { type: 'image/png' });
}

describe('useComposerAttachments', () => {
  beforeEach(() => {
    mockUpload.mockReset();
    mockProgress = null;
  });

  it('isUploading returns to false once a successful upload settles', async () => {
    mockUpload.mockResolvedValue('file-1');
    const sink = stateSink([]);
    const onChange = sink.onChange;
    const { result } = renderHook(
      () => useComposerAttachments({ selectedFileIds: [], onChange, disabled: false }),
      { wrapper: makeWrapper() },
    );

    act(() => {
      result.current.ingestFiles([pngFile()]);
    });
    expect(result.current.isUploading).toBe(true);

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });
    expect(result.current.pendingCount).toBe(0);
    expect(sink.value()).toEqual(['file-1']);
  });

  it('isUploading ALSO returns to false when the upload fails — not stuck forever', async () => {
    mockUpload.mockRejectedValue(new Error('network error'));
    const sink = stateSink([]);
    const onChange = sink.onChange;
    const { result } = renderHook(
      () => useComposerAttachments({ selectedFileIds: [], onChange, disabled: false }),
      { wrapper: makeWrapper() },
    );

    act(() => {
      result.current.ingestFiles([pngFile()]);
    });
    expect(result.current.isUploading).toBe(true);

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });
    expect(result.current.pendingCount).toBe(0);
    // A failed upload must never leave the attachment silently attached.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a second ingestFiles call after the first settled starts clean, not refused', async () => {
    mockUpload.mockResolvedValueOnce('file-1').mockResolvedValueOnce('file-2');
    const sink = stateSink([]);
    const onChange = sink.onChange;
    const { result, rerender } = renderHook(
      (props: { selectedFileIds: string[] }) =>
        useComposerAttachments({
          selectedFileIds: props.selectedFileIds,
          onChange,
          disabled: false,
        }),
      { wrapper: makeWrapper(), initialProps: { selectedFileIds: [] as string[] } },
    );

    act(() => {
      result.current.ingestFiles([pngFile('one.png')]);
    });
    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });

    rerender({ selectedFileIds: ['file-1'] });

    act(() => {
      result.current.ingestFiles([pngFile('two.png')]);
    });
    expect(result.current.isUploading).toBe(true);
    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });
    expect(sink.value()).toEqual(['file-1', 'file-2']);
  });

  it('tracks each file: Uploading, then Uploaded with its id', async () => {
    mockUpload.mockResolvedValue('file-7');
    const { result } = renderHook(
      () =>
        useComposerAttachments({
          selectedFileIds: [],
          onChange: stateSink([]).onChange,
          disabled: false,
        }),
      { wrapper: makeWrapper() },
    );

    act(() => {
      result.current.ingestFiles([pngFile('shot.png')]);
    });
    expect(result.current.uploads).toEqual([
      expect.objectContaining({
        filename: 'shot.png',
        state: ComposerAttachmentState.Uploading,
        fileId: null,
      }),
    ]);

    await waitFor(() => {
      expect(result.current.uploads[0]).toEqual(
        expect.objectContaining({ state: ComposerAttachmentState.Uploaded, fileId: 'file-7' }),
      );
    });
  });

  it('keeps a failed upload as a Failed entry WITH its reason until dismissed', async () => {
    mockUpload.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(
      () =>
        useComposerAttachments({
          selectedFileIds: [],
          onChange: stateSink([]).onChange,
          disabled: false,
        }),
      { wrapper: makeWrapper() },
    );

    act(() => {
      result.current.ingestFiles([pngFile('shot.png')]);
    });
    await waitFor(() => {
      expect(result.current.uploads[0]).toEqual(
        expect.objectContaining({
          state: ComposerAttachmentState.Failed,
          reason: 'network error',
          fileId: null,
        }),
      );
    });

    const localId = result.current.uploads[0]?.localId ?? '';
    act(() => {
      result.current.dismissUpload(localId);
    });
    expect(result.current.uploads).toEqual([]);
  });
});

describe('useComposerAttachments — cap, concurrency and tiles', () => {
  beforeEach(() => {
    mockUpload.mockReset();
    mockProgress = null;
  });

  it('keeps EVERY file when several uploads resolve before a re-render', async () => {
    // Each upload used to append to the selectedFileIds captured when the
    // batch started, so three concurrent files ended with only the last one.
    mockUpload
      .mockResolvedValueOnce('file-1')
      .mockResolvedValueOnce('file-2')
      .mockResolvedValueOnce('file-3');
    const sink = stateSink([]);
    const onChange = sink.onChange;
    const { result } = renderHook(
      () => useComposerAttachments({ selectedFileIds: [], onChange, disabled: false }),
      { wrapper: makeWrapper() },
    );

    act(() => {
      result.current.ingestFiles([pngFile('a.png'), pngFile('b.png'), pngFile('c.png')]);
    });
    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });

    expect(sink.value()).toEqual(['file-1', 'file-2', 'file-3']);
  });

  it(`refuses files past ${String(MAX_ATTACHMENTS_PER_MESSAGE)} with a translated message`, async () => {
    mockUpload.mockImplementation((file: File) => Promise.resolve(`id-${file.name}`));
    const existing = Array.from(
      { length: MAX_ATTACHMENTS_PER_MESSAGE - 1 },
      (_, i) => `f${String(i)}`,
    );
    const sink = stateSink(existing);
    const onChange = sink.onChange;
    const { result } = renderHook(
      () => useComposerAttachments({ selectedFileIds: existing, onChange, disabled: false }),
      { wrapper: makeWrapper() },
    );

    act(() => {
      result.current.ingestFiles([pngFile('one.png'), pngFile('two.png'), pngFile('three.png')]);
    });
    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(showToast.error).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'chat.attachment.tooMany' }),
    );
    expect(sink.value()).toEqual([...existing, 'id-one.png']);
  });

  it('lists an in-flight upload as a pending tile, then drops it', async () => {
    let resolveUpload: (id: string) => void = () => undefined;
    mockUpload.mockReturnValue(
      new Promise<string>((resolvePromise) => {
        resolveUpload = resolvePromise;
      }),
    );
    const { result } = renderHook(
      () => useComposerAttachments({ selectedFileIds: [], onChange: vi.fn(), disabled: false }),
      { wrapper: makeWrapper() },
    );

    act(() => {
      result.current.ingestFiles([pngFile('shot.png')]);
    });
    expect(result.current.pendingUploads).toEqual([
      expect.objectContaining({ filename: 'shot.png', mimeType: 'image/png', sizeBytes: 10 }),
    ]);

    await act(async () => {
      resolveUpload('file-9');
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.pendingUploads).toEqual([]);
    });
  });

  it('removes one attachment and keeps the rest', () => {
    const sink = stateSink(['a', 'b', 'c']);
    const onChange = sink.onChange;
    const { result } = renderHook(
      () => useComposerAttachments({ selectedFileIds: ['a', 'b', 'c'], onChange, disabled: false }),
      { wrapper: makeWrapper() },
    );

    act(() => {
      result.current.removeAttachment('b');
    });

    expect(sink.value()).toEqual(['a', 'c']);
  });
});
