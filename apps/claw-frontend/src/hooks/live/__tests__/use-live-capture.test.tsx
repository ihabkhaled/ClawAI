import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveCaptureError, LiveCaptureState, LiveStatusCode } from '@/enums/live.enum';
import { useLiveCapture } from '@/hooks/live/use-live-capture';
import { ApiClientError } from '@/services/shared/api-client';
import type { LiveTabCaptureOptions } from '@/types/live.types';

const mockStart = vi.fn();
const mockUpload = vi.fn();

vi.mock('@/utilities/live-capture.utility', () => ({
  startLiveTabCapture: (...args: unknown[]) => mockStart(...args),
}));

vi.mock('@/repositories/live/live.repository', () => ({
  liveRepository: { uploadAudio: (...args: unknown[]) => mockUpload(...args) },
}));

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function setup(status: LiveStatusCode = LiveStatusCode.ANALYZING) {
  return renderHook(
    (props: { status: LiveStatusCode }) =>
      useLiveCapture({ sessionId: 's1', enabled: true, status: props.status }),
    { wrapper, initialProps: { status } },
  );
}

describe('useLiveCapture', () => {
  let options: LiveTabCaptureOptions | null;
  const stop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    options = null;
    mockStart.mockImplementation((value: LiveTabCaptureOptions) => {
      options = value;
      return Promise.resolve({ stop });
    });
    mockUpload.mockResolvedValue({ accepted: true });
  });

  it('asks for consent first, then captures (idle → requesting → capturing)', async () => {
    const { result } = setup();
    expect(result.current.state).toBe(LiveCaptureState.IDLE);
    act(() => result.current.openConsent());
    expect(result.current.consentOpen).toBe(true);
    expect(mockStart).not.toHaveBeenCalled();
    act(() => result.current.confirm());
    expect(result.current.consentOpen).toBe(false);
    expect(result.current.state).toBe(LiveCaptureState.REQUESTING);
    await waitFor(() => expect(result.current.state).toBe(LiveCaptureState.CAPTURING));
    expect(result.current.isCapturing).toBe(true);
  });

  it('fails with NO_AUDIO when the shared tab has no audio track', async () => {
    mockStart.mockRejectedValue(new Error(LiveCaptureError.NO_AUDIO));
    const { result } = setup();
    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.state).toBe(LiveCaptureState.ERROR));
    expect(result.current.error).toBe(LiveCaptureError.NO_AUDIO);
  });

  it('returns to idle in silence when the picker is cancelled', async () => {
    mockStart.mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
    const { result } = setup();
    act(() => result.current.confirm());
    await waitFor(() => expect(mockStart).toHaveBeenCalled());
    await waitFor(() => expect(result.current.state).toBe(LiveCaptureState.IDLE));
    expect(result.current.error).toBeNull();
  });

  it('stops when the shared track ends', async () => {
    const { result } = setup();
    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.state).toBe(LiveCaptureState.CAPTURING));
    act(() => options?.onEnded());
    expect(result.current.state).toBe(LiveCaptureState.STOPPED);
  });

  it('stops on EXHAUSTED and on CREDITS_REQUIRED', async () => {
    for (const status of [LiveStatusCode.EXHAUSTED, LiveStatusCode.CREDITS_REQUIRED]) {
      stop.mockClear();
      const { result, rerender, unmount } = setup();
      act(() => result.current.confirm());
      await waitFor(() => expect(result.current.state).toBe(LiveCaptureState.CAPTURING));
      rerender({ status });
      expect(result.current.state).toBe(LiveCaptureState.STOPPED);
      expect(stop).toHaveBeenCalled();
      unmount();
    }
  });

  it('stops the capture when the modal closes (unmount)', async () => {
    const { result, unmount } = setup();
    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.state).toBe(LiveCaptureState.CAPTURING));
    unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('uploads each chunk, and stops with UPLOAD when the session refuses audio (409)', async () => {
    const { result } = setup();
    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.state).toBe(LiveCaptureState.CAPTURING));
    const chunk = { wav: new Blob(['x'], { type: 'audio/wav' }), startAt: 1 };
    act(() => options?.onChunk(chunk));
    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith('s1', chunk));
    mockUpload.mockRejectedValue(new ApiClientError({ message: 'detached', status: 409 }));
    act(() => options?.onChunk(chunk));
    await waitFor(() => expect(result.current.state).toBe(LiveCaptureState.ERROR));
    expect(result.current.error).toBe(LiveCaptureError.UPLOAD);
    expect(stop).toHaveBeenCalled();
  });
});
