import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePullProgressSse } from '@/hooks/local-frontier/use-pull-progress-sse';

type SseCallbacks = {
  onMessage: (raw: string) => void;
  onError: (error: unknown) => void;
};

const { mockConnectSse } = vi.hoisted(() => ({
  mockConnectSse: vi.fn(),
}));

vi.mock('@/utilities/sse.utility', () => ({
  connectSse: (url: string, callbacks: SseCallbacks) => mockConnectSse(url, callbacks),
}));

function makeWrapper(client: QueryClient): React.FC<{ children: React.ReactNode }> {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return Wrapper;
}

describe('usePullProgressSse', () => {
  let close: ReturnType<typeof vi.fn>;
  let captured: SseCallbacks;
  let queryClient: QueryClient;
  let invalidateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    close = vi.fn();
    captured = { onMessage: vi.fn(), onError: vi.fn() };
    mockConnectSse.mockImplementation((_url: string, callbacks: SseCallbacks) => {
      captured = callbacks;
      return { close };
    });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    invalidateSpy = vi.fn().mockResolvedValue(undefined);
    queryClient.invalidateQueries =
      invalidateSpy as unknown as typeof queryClient.invalidateQueries;
  });

  it('returns null and does not connect when jobId is null', () => {
    const { result } = renderHook(() => usePullProgressSse(null), {
      wrapper: makeWrapper(queryClient),
    });
    expect(result.current).toBeNull();
    expect(mockConnectSse).not.toHaveBeenCalled();
  });

  it('connects to /api/v1/llamacpp/pull-jobs/:id/progress when jobId provided', () => {
    renderHook(() => usePullProgressSse('job-1'), { wrapper: makeWrapper(queryClient) });
    expect(mockConnectSse).toHaveBeenCalledTimes(1);
    const firstCall = mockConnectSse.mock.calls[0];
    expect(firstCall?.[0]).toBe('/api/v1/llamacpp/pull-jobs/job-1/progress');
  });

  it('parses RUNNING progress events and exposes them via the hook return', () => {
    const { result } = renderHook(() => usePullProgressSse('job-1'), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => {
      captured.onMessage(
        JSON.stringify({
          jobId: 'job-1',
          status: 'RUNNING',
          bytesDownloaded: 1024,
          totalBytes: 4096,
          completedFiles: 0,
          totalFiles: 1,
          currentFile: 'shard-1.gguf',
          mbps: 12.5,
          etaSeconds: 240,
          reasonCode: null,
          errorMessage: null,
        }),
      );
    });

    expect(result.current?.status).toBe('RUNNING');
    expect(result.current?.bytesDownloaded).toBe(1024);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('invalidates pull-jobs + catalog queries on COMPLETED', () => {
    renderHook(() => usePullProgressSse('job-1'), { wrapper: makeWrapper(queryClient) });
    act(() => {
      captured.onMessage(
        JSON.stringify({
          jobId: 'job-1',
          status: 'COMPLETED',
          bytesDownloaded: 4096,
          totalBytes: 4096,
          completedFiles: 1,
          totalFiles: 1,
          currentFile: null,
          mbps: 0,
          etaSeconds: 0,
          reasonCode: 'OK',
          errorMessage: null,
        }),
      );
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it('invalidates queries on FAILED and CANCELLED states too', () => {
    renderHook(() => usePullProgressSse('job-1'), { wrapper: makeWrapper(queryClient) });

    act(() => {
      captured.onMessage(
        JSON.stringify({
          jobId: 'job-1',
          status: 'FAILED',
          bytesDownloaded: 100,
          totalBytes: 200,
          completedFiles: 0,
          totalFiles: 1,
          currentFile: null,
          mbps: 0,
          etaSeconds: null,
          reasonCode: 'SHA_MISMATCH',
          errorMessage: 'sha mismatch',
        }),
      );
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(2);

    invalidateSpy.mockClear();

    act(() => {
      captured.onMessage(
        JSON.stringify({
          jobId: 'job-1',
          status: 'CANCELLED',
          bytesDownloaded: 100,
          totalBytes: 200,
          completedFiles: 0,
          totalFiles: 1,
          currentFile: null,
          mbps: 0,
          etaSeconds: null,
          reasonCode: 'USER_CANCELLED',
          errorMessage: null,
        }),
      );
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it('does NOT throw on malformed JSON payloads', () => {
    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderHook(() => usePullProgressSse('job-1'), { wrapper: makeWrapper(queryClient) });
    expect(() =>
      act(() => {
        captured.onMessage('not-json');
      }),
    ).not.toThrow();
    expect(consoleErrSpy).toHaveBeenCalled();
    consoleErrSpy.mockRestore();
  });

  it('closes the SSE connection when jobId becomes null (cleanup)', () => {
    const { rerender } = renderHook(({ jobId }) => usePullProgressSse(jobId), {
      wrapper: makeWrapper(queryClient),
      initialProps: { jobId: 'job-1' as string | null },
    });
    expect(close).not.toHaveBeenCalled();
    rerender({ jobId: null });
    expect(close).toHaveBeenCalledTimes(1);
  });
});
