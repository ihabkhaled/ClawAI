import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFileThumbnailBlob } from '@/hooks/files/use-file-thumbnail-blob';
import { filesRepository } from '@/repositories/files/files.repository';

vi.mock('@/repositories/files/files.repository', () => ({
  filesRepository: { downloadBlob: vi.fn() },
}));

const downloadBlob = vi.mocked(filesRepository.downloadBlob);

function wrapperFor(client: QueryClient): ({ children }: { children: ReactNode }) => ReactNode {
  return function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useFileThumbnailBlob', () => {
  let counter = 0;
  const createObjectURL = vi.fn(() => `blob:thumb-${String(++counter)}`);
  const revokeObjectURL = vi.fn();
  let client: QueryClient;

  beforeEach(() => {
    counter = 0;
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    downloadBlob.mockReset();
    downloadBlob.mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('downloads nothing while disabled', () => {
    const { result } = renderHook(() => useFileThumbnailBlob('f1', false), {
      wrapper: wrapperFor(client),
    });

    expect(downloadBlob).not.toHaveBeenCalled();
    expect(result.current.blobUrl).toBeNull();
  });

  it('turns the downloaded bytes into an object URL and revokes it on unmount', async () => {
    const { result, unmount } = renderHook(() => useFileThumbnailBlob('f1', true), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.blobUrl).toBe('blob:thumb-1'));
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:thumb-1');
  });

  it('downloads a file once, however many rows mount for it', async () => {
    const wrapper = wrapperFor(client);
    const first = renderHook(() => useFileThumbnailBlob('f1', true), { wrapper });
    await waitFor(() => expect(first.result.current.blobUrl).not.toBeNull());
    first.unmount();

    const second = renderHook(() => useFileThumbnailBlob('f1', true), { wrapper });
    await waitFor(() => expect(second.result.current.blobUrl).not.toBeNull());

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(downloadBlob).toHaveBeenCalledWith('f1');
  });

  it('reports a failed download', async () => {
    downloadBlob.mockRejectedValue(new Error('404'));
    const { result } = renderHook(() => useFileThumbnailBlob('gone', true), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.blobUrl).toBeNull();
  });
});
