import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFileDownload } from '@/hooks/chat/use-file-download';
import { useFileGenerationBubble } from '@/hooks/chat/use-file-generation-bubble';

const { useFileGenerationListener, rebuild } = vi.hoisted(() => ({
  useFileGenerationListener: vi.fn(),
  rebuild: vi.fn(),
}));
vi.mock('@/hooks/chat/use-file-generation-listener', () => ({ useFileGenerationListener }));
vi.mock('@/repositories/file-generation/file-generation.repository', () => ({
  fileGenerationRepository: { rebuild },
}));
vi.mock('@/utilities', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAccessToken: () => 'tok',
}));

const generation = (expiresAt: string | null) => ({
  id: 'g1',
  status: 'COMPLETED',
  format: 'PDF',
  filename: 'Report.pdf',
  assets: [
    {
      id: 'a1',
      url: '/x',
      downloadUrl: '/api/v1/file-generations/g1/assets/a1/download',
      mimeType: 'application/pdf',
      sizeBytes: 1,
      expiresAt,
      expiredAt: null,
      createdAt: '2026-09-19T11:00:00.000Z',
    },
  ],
});

describe('useFileGenerationBubble', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports an expired asset and rebuilds by re-subscribing', async () => {
    useFileGenerationListener.mockReturnValue(generation('2000-01-01T00:00:00.000Z'));
    rebuild.mockResolvedValue(undefined);

    const { result } = renderHook(() => useFileGenerationBubble('g1'));
    expect(result.current.expired).toBe(true);
    expect(result.current.minutesLeft).toBeNull();

    act(() => result.current.rebuild());
    await waitFor(() => expect(rebuild).toHaveBeenCalledWith('g1'));
    // The listener is asked again with a new refresh key, so the rebuilt file shows.
    await waitFor(() => expect(useFileGenerationListener).toHaveBeenLastCalledWith('g1', 1));
  });

  it('reports minutes left on a live asset', () => {
    useFileGenerationListener.mockReturnValue(
      generation(new Date(Date.now() + 30 * 60_000 + 30_000).toISOString()),
    );

    const { result } = renderHook(() => useFileGenerationBubble('g1'));

    expect(result.current.expired).toBe(false);
    expect(result.current.minutesLeft).toBe(30);
  });
});

describe('useFileDownload', () => {
  it('downloads with the session and marks a failure on a non-OK answer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 410 });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useFileDownload());
    await act(async () => {
      await result.current.download('/api/v1/file-generations/g1/assets/a1/download', 'r.pdf');
    });

    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ headers: { Authorization: 'Bearer tok' } });
    expect(result.current.failed).toBe(true);
    vi.unstubAllGlobals();
  });

  it('saves the file on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['x']) }),
    );
    const createObjectURL = vi.fn(() => 'blob:1');
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const { result } = renderHook(() => useFileDownload());
    await act(async () => {
      await result.current.download('/api/v1/file-generations/g1/assets/a1/download', 'r.pdf');
    });

    expect(click).toHaveBeenCalled();
    expect(result.current.failed).toBe(false);
    vi.unstubAllGlobals();
  });
});
