import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useImageGenerationListener } from '@/hooks/chat/use-image-generation-listener';

type SseCallbacks = {
  onMessage: (raw: string) => void;
  onError: (error: unknown) => void;
  shouldReconnectAfterClose?: () => boolean;
};

const { mockConnectSse, mockGetById } = vi.hoisted(() => ({
  mockConnectSse: vi.fn(),
  mockGetById: vi.fn(),
}));

vi.mock('@/utilities/sse.utility', () => ({
  connectSse: (url: string, callbacks: SseCallbacks, options: unknown) =>
    mockConnectSse(url, callbacks, options),
}));

vi.mock('@/repositories/image-generation/image-generation.repository', () => ({
  imageGenerationRepository: { getById: mockGetById },
}));

const generating = {
  id: 'img-1',
  status: 'GENERATING',
  provider: 'IMAGE_GEMINI',
  model: 'gemini-2.5-flash-image',
  assets: [],
};

describe('useImageGenerationListener', () => {
  let close: ReturnType<typeof vi.fn>;
  let captured: SseCallbacks | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    close = vi.fn();
    captured = undefined;
    mockConnectSse.mockImplementation((_url: string, callbacks: SseCallbacks) => {
      captured = callbacks;
      return { close };
    });
    mockGetById.mockResolvedValue(generating);
  });

  // The events route now requires the owner's session. A native EventSource
  // cannot send a Bearer header, so the hook must use the authenticated
  // fetch-based client — never `new EventSource`.
  it('opens the events stream through the authenticated SSE client', async () => {
    const eventSourceSpy = vi.fn();
    vi.stubGlobal('EventSource', eventSourceSpy);

    renderHook(() => useImageGenerationListener('img-1'));

    await waitFor(() => expect(mockConnectSse).toHaveBeenCalledTimes(1));
    expect(String(mockConnectSse.mock.calls[0]?.[0])).toMatch(/\/images\/img-1\/events$/);
    expect(mockConnectSse.mock.calls[0]?.[2]).toEqual({ reconnect: false });
    expect(eventSourceSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('does not open a stream for a generation that is already terminal', async () => {
    mockGetById.mockResolvedValue({ ...generating, status: 'COMPLETED' });
    const { result } = renderHook(() => useImageGenerationListener('img-1'));
    await waitFor(() => expect(result.current?.status).toBe('COMPLETED'));
    expect(mockConnectSse).not.toHaveBeenCalled();
  });

  it('applies streamed events and closes on a terminal one', async () => {
    const { result } = renderHook(() => useImageGenerationListener('img-1'));
    await waitFor(() => expect(captured).toBeDefined());

    act(() => {
      captured?.onMessage(JSON.stringify({ generationId: 'img-1', status: 'FINALIZING' }));
    });
    expect(result.current?.status).toBe('FINALIZING');

    act(() => {
      captured?.onMessage(JSON.stringify({ generationId: 'img-1', status: 'COMPLETED' }));
    });
    expect(close).toHaveBeenCalled();
    expect(captured?.shouldReconnectAfterClose?.()).toBe(false);
  });

  // Defect 1: an AUTO fallback continues the job on a NEW row and the FAILED
  // event on the original row names it. The card must follow, not stop.
  it('follows a live supersession instead of stopping on FAILED', async () => {
    mockGetById.mockImplementation(async (id: string) =>
      id === 'img-2'
        ? { ...generating, id: 'img-2', provider: 'IMAGE_OPENAI', status: 'GENERATING' }
        : generating,
    );
    const { result } = renderHook(() => useImageGenerationListener('img-1'));
    await waitFor(() => expect(captured).toBeDefined());
    const firstStream = captured;

    act(() => {
      firstStream?.onMessage(
        JSON.stringify({ generationId: 'img-1', status: 'FAILED', supersededById: 'img-2' }),
      );
    });

    await waitFor(() => expect(result.current?.id).toBe('img-2'));
    expect(close).toHaveBeenCalled();
    await waitFor(() => expect(mockConnectSse).toHaveBeenCalledTimes(2));
    expect(String(mockConnectSse.mock.calls[1]?.[0])).toMatch(/\/images\/img-2\/events$/);
    expect(result.current?.status).not.toBe('FAILED');
  });

  // Defects 1 + 2 after a refresh: the stored id is the ORIGINAL row; GET
  // resolves `latest`, and the card renders what the fallback / alternate made.
  it('restores the chain head after a refresh', async () => {
    const asset = { id: 'a', url: '/api/v1/files/download/f' };
    mockGetById.mockImplementation(async (id: string) =>
      id === 'img-1'
        ? {
            ...generating,
            status: 'FAILED',
            supersededById: 'img-3',
            latest: {
              id: 'img-3',
              status: 'COMPLETED',
              provider: 'IMAGE_OPENAI',
              model: 'gpt-image-1',
              assets: [asset],
            },
          }
        : { ...generating, id, status: 'COMPLETED', provider: 'IMAGE_OPENAI', assets: [asset] },
    );

    const { result } = renderHook(() => useImageGenerationListener('img-1'));

    await waitFor(() => expect(result.current?.id).toBe('img-3'));
    expect(result.current?.status).toBe('COMPLETED');
    await waitFor(() => expect(mockGetById).toHaveBeenCalledWith('img-3'));
    expect(mockConnectSse).not.toHaveBeenCalled();
  });

  it('stops following after the hop limit instead of chasing a chain forever', async () => {
    mockGetById.mockImplementation(async (id: string) => {
      const next = `img-${String(Number(id.replace('img-', '')) + 1)}`;
      return {
        ...generating,
        id,
        status: 'FAILED',
        supersededById: next,
        latest: { id: next, status: 'FAILED', provider: 'p', model: 'm', assets: [] },
      };
    });

    renderHook(() => useImageGenerationListener('img-1'));

    await waitFor(() => expect(mockGetById).toHaveBeenCalledWith('img-9'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockGetById).not.toHaveBeenCalledWith('img-10');
    expect(mockGetById.mock.calls.length).toBeLessThanOrEqual(9);
  });

  it('keeps the last runtime stage while generating and clears it when the job moves on', async () => {
    const { result } = renderHook(() => useImageGenerationListener('img-1'));
    await waitFor(() => expect(captured).toBeDefined());

    act(() => {
      captured?.onMessage(
        JSON.stringify({
          generationId: 'img-1',
          status: 'GENERATING',
          runtimeProgress: { stage: 'EXECUTING_NODE', currentStep: 3, totalSteps: 20 },
        }),
      );
    });
    expect(result.current?.runtimeProgress).toMatchObject({
      stage: 'EXECUTING_NODE',
      currentStep: 3,
    });

    act(() => {
      captured?.onMessage(JSON.stringify({ generationId: 'img-1', status: 'FINALIZING' }));
    });
    expect(result.current?.runtimeProgress).toBeNull();
  });

  it('falls back to polling when the stream is refused (e.g. 401/404)', async () => {
    renderHook(() => useImageGenerationListener('img-1'));
    await waitFor(() => expect(captured).toBeDefined());
    const callsBefore = mockGetById.mock.calls.length;

    act(() => {
      captured?.onError(new Error('SSE connection failed: 404'));
    });

    expect(close).toHaveBeenCalled();
    await waitFor(() => expect(mockGetById.mock.calls.length).toBeGreaterThan(callsBefore));
  });
});
