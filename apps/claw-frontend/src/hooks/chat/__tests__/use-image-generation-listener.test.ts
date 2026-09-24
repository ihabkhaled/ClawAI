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
