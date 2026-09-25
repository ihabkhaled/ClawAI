import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthenticatedFileBlob } from '@/hooks/chat/use-authenticated-file-blob';

vi.mock('@/utilities', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAccessToken: () => 'tok',
}));

describe('useAuthenticatedFileBlob', () => {
  beforeEach(() => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches nothing until load() is called when autoLoad is false', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useAuthenticatedFileBlob('/api/v1/files/download/f1', false));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches immediately when autoLoad is true', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['x']) });
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useAuthenticatedFileBlob('/api/v1/files/download/f1', true));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ headers: { Authorization: 'Bearer tok' } });
  });

  it('load() fetches once and sets blobUrl on success — a voice/video note becomes playable on click', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['x']) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() =>
      useAuthenticatedFileBlob('/api/v1/files/download/f1', false),
    );
    await act(async () => {
      result.current.load();
    });

    await waitFor(() => expect(result.current.blobUrl).toBe('blob:mock'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('exposes the fetched Blob itself, so a text preview never has to fetch its own blob: URL', async () => {
    const bytes = new Blob(['hello'], { type: 'text/plain' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => bytes }));

    const { result } = renderHook(() =>
      useAuthenticatedFileBlob('/api/v1/files/download/f1', false),
    );
    expect(result.current.blob).toBeNull();
    await act(async () => {
      result.current.load();
    });

    await waitFor(() => expect(result.current.blob).toBe(bytes));
  });

  it('load() is a no-op once already started — never re-downloads the same file', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['x']) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() =>
      useAuthenticatedFileBlob('/api/v1/files/download/f1', false),
    );
    await act(async () => {
      result.current.load();
      result.current.load();
    });
    await waitFor(() => expect(result.current.blobUrl).toBe('blob:mock'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sets a real error (not a silent null) when the download fails — never a broken placeholder', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const { result } = renderHook(() =>
      useAuthenticatedFileBlob('/api/v1/files/download/f1', false),
    );
    await act(async () => {
      result.current.load();
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.blobUrl).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
