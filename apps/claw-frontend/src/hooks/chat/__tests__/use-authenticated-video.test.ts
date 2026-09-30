import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthenticatedVideo } from '@/hooks/chat/use-authenticated-video';

vi.mock('@/utilities/api.utility', () => ({
  getAccessToken: () => 'tok-123',
}));

describe('useAuthenticatedVideo', () => {
  const createObjectURL = vi.fn();
  const revokeObjectURL = vi.fn();
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURL.mockReturnValue('blob:video-1');
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing without a path', () => {
    const { result } = renderHook(() => useAuthenticatedVideo(undefined));
    expect(result.current).toEqual({ blobUrl: null, failed: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches with the Bearer token and exposes a blob URL, revoked on unmount', async () => {
    fetchMock.mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });

    const { result, unmount } = renderHook(() =>
      useAuthenticatedVideo('/api/v1/files/download/f-1'),
    );

    await waitFor(() => expect(result.current.blobUrl).toBe('blob:video-1'));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/files/download/f-1');
    expect(init.headers).toEqual({ Authorization: 'Bearer tok-123' });

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:video-1');
  });

  it('reports failure when the download is refused', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });

    const { result } = renderHook(() => useAuthenticatedVideo('/api/v1/files/download/f-1'));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.blobUrl).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('never leaks an object URL for a fetch that resolves after unmount', async () => {
    let resolveBlob: (blob: Blob) => void = () => undefined;
    fetchMock.mockResolvedValue({
      ok: true,
      blob: () =>
        new Promise<Blob>((resolve) => {
          resolveBlob = resolve;
        }),
    });

    const { unmount } = renderHook(() => useAuthenticatedVideo('/api/v1/files/download/f-1'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    unmount();
    resolveBlob(new Blob(['x']));
    await Promise.resolve();
    await Promise.resolve();

    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
