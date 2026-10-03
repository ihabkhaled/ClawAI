import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVideoGenerationBubbleState } from '@/hooks/chat/use-video-generation-bubble-state';
import type { VideoGeneration } from '@/types/video-generation.types';

const { mockListener, mockRetry, mockCancel, stopRef } = vi.hoisted(() => ({
  stopRef: { current: undefined as (() => void) | undefined },
  mockListener: vi.fn(),
  mockRetry: vi.fn(),
  mockCancel: vi.fn(),
}));

vi.mock('@/hooks/chat/use-video-generation-listener', () => ({
  useVideoGenerationListener: (id: string, token: number, onStopped?: () => void) => {
    stopRef.current = onStopped;
    return mockListener(id, token);
  },
}));

vi.mock('@/repositories/video-generation/video-generation.repository', () => ({
  videoGenerationRepository: { retry: mockRetry, cancel: mockCancel },
}));

const shown = (overrides: Partial<VideoGeneration> = {}): VideoGeneration => ({
  id: 'vid-2',
  status: 'GENERATING' as VideoGeneration['status'],
  provider: 'VIDEO_GROK',
  model: 'grok-imagine-video',
  prompt: 'a fox',
  durationSeconds: 4,
  aspectRatio: '16:9',
  errorCode: null,
  errorMessage: null,
  createdAt: '2026-09-30T00:00:00Z',
  completedAt: null,
  supersededById: null,
  isAutoMode: true,
  asset: null,
  ...overrides,
});

describe('useVideoGenerationBubbleState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRetry.mockResolvedValue({ generationId: 'vid-2' });
    mockCancel.mockResolvedValue({ id: 'vid-2', status: 'CANCELLED' });
  });

  it('offers Cancel only while the shown row is in progress', () => {
    mockListener.mockReturnValue(shown());
    const { result, rerender } = renderHook(() =>
      useVideoGenerationBubbleState({ generationId: 'vid-1' }),
    );
    expect(result.current.canCancel).toBe(true);

    mockListener.mockReturnValue(shown({ status: 'COMPLETED' as VideoGeneration['status'] }));
    rerender();
    expect(result.current.canCancel).toBe(false);

    mockListener.mockReturnValue(null);
    rerender();
    expect(result.current.canCancel).toBe(false);
    expect(result.current.activeGenId).toBe('vid-1');
  });

  it('says the status is unknown once polling gave up on a job that never ended', () => {
    mockListener.mockReturnValue(shown());
    const { result } = renderHook(() => useVideoGenerationBubbleState({ generationId: 'vid-1' }));
    expect(result.current.isStatusUnknown).toBe(false);

    act(() => {
      stopRef.current?.();
    });
    expect(result.current.isStatusUnknown).toBe(true);
  });

  it('does not call a finished job unknown just because polling stopped', () => {
    mockListener.mockReturnValue(shown({ status: 'FAILED' as VideoGeneration['status'] }));
    const { result } = renderHook(() => useVideoGenerationBubbleState({ generationId: 'vid-1' }));

    act(() => {
      stopRef.current?.();
    });
    expect(result.current.isStatusUnknown).toBe(false);
  });

  it('retries the row the card is SHOWING (the chain head), then re-reads it', async () => {
    mockListener.mockReturnValue(shown({ id: 'vid-2' }));
    const { result } = renderHook(() => useVideoGenerationBubbleState({ generationId: 'vid-1' }));

    act(() => {
      result.current.handleRetry();
    });

    await waitFor(() => expect(mockListener).toHaveBeenLastCalledWith('vid-1', 1));
    expect(mockRetry).toHaveBeenCalledWith('vid-2');
  });

  it('follows the successor id a retry answers with', async () => {
    mockListener.mockReturnValue(shown({ id: 'vid-2' }));
    mockRetry.mockResolvedValue({ generationId: 'vid-9' });
    const { result } = renderHook(() => useVideoGenerationBubbleState({ generationId: 'vid-1' }));

    act(() => {
      result.current.handleRetry();
    });

    await waitFor(() => expect(mockListener).toHaveBeenLastCalledWith('vid-9', 1));
  });

  it('sends ONE cancel for two presses, then re-reads the row', async () => {
    mockListener.mockReturnValue(shown());
    const { result } = renderHook(() => useVideoGenerationBubbleState({ generationId: 'vid-1' }));

    act(() => {
      result.current.handleCancel();
      result.current.handleCancel();
    });
    expect(result.current.isCancelling).toBe(true);

    await waitFor(() => expect(result.current.isCancelling).toBe(false));
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockCancel).toHaveBeenCalledWith('vid-2');
    expect(mockListener).toHaveBeenLastCalledWith('vid-1', 1);
  });

  it('survives a refused cancel and re-enables the button', async () => {
    mockListener.mockReturnValue(shown());
    mockCancel.mockRejectedValue(new Error('409'));
    const { result } = renderHook(() => useVideoGenerationBubbleState({ generationId: 'vid-1' }));

    act(() => {
      result.current.handleCancel();
    });

    await waitFor(() => expect(result.current.isCancelling).toBe(false));
    expect(mockListener).toHaveBeenLastCalledWith('vid-1', 0);
  });
});
