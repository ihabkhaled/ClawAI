import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  VIDEO_GENERATION_MAX_POLLS,
  VIDEO_GENERATION_POLL_INTERVAL_MS,
} from '@/constants/video.constants';
import { useVideoGenerationListener } from '@/hooks/chat/use-video-generation-listener';

const { mockGetById } = vi.hoisted(() => ({ mockGetById: vi.fn() }));

vi.mock('@/repositories/video-generation/video-generation.repository', () => ({
  videoGenerationRepository: { getById: mockGetById },
}));

const row = (id: string, status: string, extra: Record<string, unknown> = {}) => ({
  id,
  status,
  provider: 'VIDEO_GEMINI',
  model: 'veo-3.1-fast-generate-preview',
  prompt: 'a fox',
  supersededById: null,
  asset: null,
  ...extra,
});

const tick = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe('useVideoGenerationListener', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetById.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads at once, then every 4 seconds until a terminal status, then stops', async () => {
    mockGetById
      .mockResolvedValueOnce(row('vid-1', 'QUEUED'))
      .mockResolvedValueOnce(row('vid-1', 'GENERATING'))
      .mockResolvedValue(row('vid-1', 'COMPLETED'));

    const { result } = renderHook(() => useVideoGenerationListener('vid-1'));
    await tick(0);
    expect(mockGetById).toHaveBeenCalledTimes(1);
    expect(result.current?.status).toBe('QUEUED');

    await tick(VIDEO_GENERATION_POLL_INTERVAL_MS - 1);
    expect(mockGetById).toHaveBeenCalledTimes(1);
    await tick(1);
    expect(result.current?.status).toBe('GENERATING');

    await tick(VIDEO_GENERATION_POLL_INTERVAL_MS);
    expect(result.current?.status).toBe('COMPLETED');
    expect(mockGetById).toHaveBeenCalledTimes(3);

    await tick(VIDEO_GENERATION_POLL_INTERVAL_MS * 5);
    expect(mockGetById).toHaveBeenCalledTimes(3);
    expect(mockGetById).toHaveBeenCalledWith('vid-1');
  });

  it('never polls more than the hard cap (15 minutes), even if the job never ends', async () => {
    mockGetById.mockResolvedValue(row('vid-1', 'GENERATING'));

    renderHook(() => useVideoGenerationListener('vid-1'));
    await tick(VIDEO_GENERATION_POLL_INTERVAL_MS * (VIDEO_GENERATION_MAX_POLLS + 50));

    expect(mockGetById).toHaveBeenCalledTimes(VIDEO_GENERATION_MAX_POLLS);
  });

  it('follows latest to the fallback row and keeps polling that row', async () => {
    mockGetById
      .mockResolvedValueOnce(
        row('vid-1', 'FAILED', {
          latest: row('vid-2', 'GENERATING', { provider: 'VIDEO_GROK' }),
        }),
      )
      .mockResolvedValue(row('vid-2', 'COMPLETED', { provider: 'VIDEO_GROK' }));

    const { result } = renderHook(() => useVideoGenerationListener('vid-1'));
    await tick(0);

    // The first read handed off to the fallback row, which was read next.
    expect(mockGetById.mock.calls.map((call) => call[0])).toEqual(['vid-1', 'vid-2']);
    expect(result.current?.id).toBe('vid-2');
    expect(result.current?.status).toBe('COMPLETED');
    expect(result.current?.provider).toBe('VIDEO_GROK');
  });

  it('gives up after five failed reads in a row', async () => {
    mockGetById.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useVideoGenerationListener('vid-1'));
    await tick(VIDEO_GENERATION_POLL_INTERVAL_MS * 20);

    expect(mockGetById).toHaveBeenCalledTimes(5);
    expect(result.current).toBeNull();
  });

  it('re-reads the row when the restart token changes', async () => {
    mockGetById.mockResolvedValue(row('vid-1', 'CANCELLED'));

    const { rerender } = renderHook(({ token }) => useVideoGenerationListener('vid-1', token), {
      initialProps: { token: 0 },
    });
    await tick(0);
    expect(mockGetById).toHaveBeenCalledTimes(1);

    rerender({ token: 1 });
    await tick(0);
    expect(mockGetById).toHaveBeenCalledTimes(2);
  });

  it('stops polling on unmount', async () => {
    mockGetById.mockResolvedValue(row('vid-1', 'GENERATING'));

    const { unmount } = renderHook(() => useVideoGenerationListener('vid-1'));
    await tick(0);
    unmount();
    await tick(VIDEO_GENERATION_POLL_INTERVAL_MS * 3);

    expect(mockGetById).toHaveBeenCalledTimes(1);
  });
});
