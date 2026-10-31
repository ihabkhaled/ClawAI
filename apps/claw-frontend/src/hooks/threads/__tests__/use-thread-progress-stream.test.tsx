import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeProgress } from '@/components/threads/__tests__/thread-progress.fixture';
import {
  THREAD_PROGRESS_POLL_INTERVAL_MS,
  THREAD_PROGRESS_STREAM_HIDDEN_PAUSE_MS,
  THREAD_PROGRESS_STREAM_MAX_FALLBACK_RETRIES,
  THREAD_PROGRESS_STREAM_RETRY_AFTER_FALLBACK_MS,
} from '@/constants/thread-generation-progress.constants';
import { SseConnectionHealth } from '@/enums';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { connectSse } from '@/utilities/sse.utility';

import { useThreadGenerationProgress } from '../use-thread-generation-progress';

vi.mock('@/utilities/sse.utility', () => ({ connectSse: vi.fn() }));
vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: { getGenerationProgress: vi.fn() },
}));

type Callbacks = Parameters<typeof connectSse>[1];
type Options = NonNullable<Parameters<typeof connectSse>[2]>;
type Fake = { callbacks: Callbacks; options: Options; close: ReturnType<typeof vi.fn> };

let connections: Fake[];

const running = (steps: number, updatedAt = '2026-10-13T10:01:00.000Z') =>
  makeProgress({
    status: 'RUNNING',
    failure: null,
    updatedAt,
    steps: Array.from({ length: steps }, (_, index) => ({
      seq: index + 1,
      at: '2026-10-13T10:00:00.000Z',
      stage: 'AUTHOR_DRAFTS',
      round: 1,
      outcome: 'SUCCEEDED' as const,
      roleKind: 'AUTHOR' as const,
      roleId: 'author-1',
      provider: 'GEMINI',
      model: 'm',
      code: null,
      httpStatus: null,
      durationMs: 10,
      inputTokens: 1,
      outputTokens: 1,
      excerpt: null,
    })),
  });

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => useThreadGenerationProgress('pub-1'), { wrapper });
  return { client, ...view };
}

/** Delivers one stream message and lets react-query's batched notification reach the hook. */
async function push(value: unknown): Promise<void> {
  await act(async () => {
    (connections[connections.length - 1] as Fake).callbacks.onMessage(
      typeof value === 'string' ? value : JSON.stringify(value),
    );
    await vi.advanceTimersByTimeAsync(5);
  });
}

const latest = (): Fake => connections[connections.length - 1] as Fake;

function setVisibility(state: 'hidden' | 'visible'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('progress stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connections = [];
    vi.mocked(connectSse).mockImplementation((_url, callbacks, options) => {
      const close = vi.fn();
      connections.push({ callbacks, options: options ?? {}, close });
      return { close };
    });
    vi.mocked(threadPublicationsRepository.getGenerationProgress).mockResolvedValue(running(1));
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    setVisibility('visible');
    vi.useRealTimers();
  });

  it('opens the stream route with a retry cap, jitter and an attempt reset', async () => {
    setup();
    await waitFor(() => expect(connections).toHaveLength(1));
    expect(vi.mocked(connectSse).mock.calls[0]?.[0]).toMatch(
      /\/thread-publications\/pub-1\/generation-progress\/stream$/,
    );
    expect(latest().options).toMatchObject({ maxAttempts: 4, resetAttemptsAfterLive: true });
    expect(latest().options.jitterRatio).toBeGreaterThan(0);
  });

  it('writes pushed snapshots into the same cache entry and stops polling while live', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.progress?.steps).toHaveLength(1));
    act(() => latest().callbacks.onHealthChange?.(SseConnectionHealth.LIVE));
    await push({ type: 'progress', progress: running(2, '2026-10-13T10:02:00.000Z') });
    expect(result.current.progress?.steps).toHaveLength(2);
    await push({ type: 'progress', progress: running(3, '2026-10-13T10:03:00.000Z') });
    expect(result.current.progress?.steps).toHaveLength(3);

    const calls = vi.mocked(threadPublicationsRepository.getGenerationProgress).mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_POLL_INTERVAL_MS * 4);
    });
    expect(threadPublicationsRepository.getGenerationProgress).toHaveBeenCalledTimes(calls);
  });

  it('ignores a stale or duplicate snapshot and malformed messages', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.progress?.steps).toHaveLength(1));
    await push({ type: 'progress', progress: running(3, '2026-10-13T10:03:00.000Z') });
    await push({ type: 'progress', progress: running(2, '2026-10-13T10:02:00.000Z') });
    expect(result.current.progress?.steps).toHaveLength(3);
    await push({ type: 'progress', progress: running(3, '2026-10-13T10:03:00.000Z') });
    await push('not json');
    await push({ type: 'progress', progress: { nope: true } });
    await push({ type: 'weird' });
    await push({ type: 'heartbeat' });
    expect(result.current.progress?.steps).toHaveLength(3);
  });

  it('does not spend the poll budget on pushed snapshots', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.progress).toBeDefined());
    act(() => latest().callbacks.onHealthChange?.(SseConnectionHealth.LIVE));
    for (let i = 0; i < 450; i += 1) {
      await push({
        type: 'progress',
        progress: running(1, new Date(Date.UTC(2026, 9, 14, 10, 0, i)).toISOString()),
      });
    }
    expect(result.current.pollingPaused).toBe(false);
  });

  it('keeps polling while the stream is still connecting or reconnecting', async () => {
    setup();
    await waitFor(() => expect(connections).toHaveLength(1));
    const calls = vi.mocked(threadPublicationsRepository.getGenerationProgress).mock.calls.length;
    act(() => latest().callbacks.onHealthChange?.(SseConnectionHealth.RECONNECTING));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_POLL_INTERVAL_MS + 100);
    });
    expect(
      vi.mocked(threadPublicationsRepository.getGenerationProgress).mock.calls.length,
    ).toBeGreaterThan(calls);
  });

  it('resumes polling when a live stream drops, then stops again when it is back', async () => {
    setup();
    await waitFor(() => expect(connections).toHaveLength(1));
    act(() => latest().callbacks.onHealthChange?.(SseConnectionHealth.LIVE));
    act(() => latest().callbacks.onHealthChange?.(SseConnectionHealth.RECONNECTING));
    let calls = vi.mocked(threadPublicationsRepository.getGenerationProgress).mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_POLL_INTERVAL_MS + 100);
    });
    expect(
      vi.mocked(threadPublicationsRepository.getGenerationProgress).mock.calls.length,
    ).toBeGreaterThan(calls);
    act(() => latest().callbacks.onHealthChange?.(SseConnectionHealth.LIVE));
    calls = vi.mocked(threadPublicationsRepository.getGenerationProgress).mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_POLL_INTERVAL_MS * 3);
    });
    expect(threadPublicationsRepository.getGenerationProgress).toHaveBeenCalledTimes(calls);
  });

  it('falls back silently to polling when reconnects are exhausted, then retries the stream', async () => {
    const { result } = setup();
    await waitFor(() => expect(connections).toHaveLength(1));
    act(() => latest().callbacks.onHealthChange?.(SseConnectionHealth.LOST));
    act(() => latest().callbacks.onError(new Error('SSE reconnect attempts exhausted')));
    expect(latest().close).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    const calls = vi.mocked(threadPublicationsRepository.getGenerationProgress).mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_POLL_INTERVAL_MS + 100);
    });
    expect(
      vi.mocked(threadPublicationsRepository.getGenerationProgress).mock.calls.length,
    ).toBeGreaterThan(calls);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_STREAM_RETRY_AFTER_FALLBACK_MS);
    });
    expect(connections).toHaveLength(2);
  });

  it('gives up retrying the stream after the fallback retry cap', async () => {
    setup();
    await waitFor(() => expect(connections).toHaveLength(1));
    for (let i = 0; i <= THREAD_PROGRESS_STREAM_MAX_FALLBACK_RETRIES; i += 1) {
      act(() => latest().callbacks.onError(new Error('SSE reconnect attempts exhausted')));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_STREAM_RETRY_AFTER_FALLBACK_MS + 10);
      });
    }
    expect(connections).toHaveLength(1 + THREAD_PROGRESS_STREAM_MAX_FALLBACK_RETRIES);
  });

  it('never retries a refused stream (403/404) and leaves polling to report it', async () => {
    setup();
    await waitFor(() => expect(connections).toHaveLength(1));
    act(() => latest().callbacks.onError(new Error('SSE connection failed: 404')));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_STREAM_RETRY_AFTER_FALLBACK_MS * 3);
    });
    expect(connections).toHaveLength(1);
    expect(latest().close).toHaveBeenCalled();
  });

  it('closes the stream on a terminal event and on a terminal snapshot', async () => {
    const { result } = setup();
    await waitFor(() => expect(connections).toHaveLength(1));
    await push({
      type: 'progress',
      progress: makeProgress({
        status: 'COMPLETED',
        failure: null,
        updatedAt: '2026-10-13T10:09:00.000Z',
      }),
    });
    expect(result.current.progress?.status).toBe('COMPLETED');
    await waitFor(() => expect(latest().close).toHaveBeenCalled());
    expect(latest().callbacks.shouldReconnectAfterClose?.()).toBe(false);
  });

  it('does not reconnect after a terminal message', async () => {
    setup();
    await waitFor(() => expect(connections).toHaveLength(1));
    await push({ type: 'terminal' });
    expect(latest().close).toHaveBeenCalled();
    expect(latest().callbacks.shouldReconnectAfterClose?.()).toBe(false);
  });

  it('opens no stream for a job that is already terminal', async () => {
    vi.mocked(threadPublicationsRepository.getGenerationProgress).mockResolvedValue(
      makeProgress({ status: 'FAILED' }),
    );
    const { result } = setup();
    await waitFor(() => expect(result.current.progress?.status).toBe('FAILED'));
    expect(connections.every((connection) => connection.close.mock.calls.length > 0)).toBe(true);
  });

  it('closes the stream on unmount', async () => {
    const { unmount } = setup();
    await waitFor(() => expect(connections).toHaveLength(1));
    unmount();
    expect(latest().close).toHaveBeenCalled();
  });

  it('closes after a long hidden period and opens a fresh stream when shown again', async () => {
    setup();
    await waitFor(() => expect(connections).toHaveLength(1));
    act(() => setVisibility('hidden'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_STREAM_HIDDEN_PAUSE_MS - 1000);
    });
    expect(latest().close).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(latest().close).toHaveBeenCalled();
    act(() => setVisibility('visible'));
    expect(connections).toHaveLength(2);
  });

  it('keeps the stream when the tab is hidden only briefly', async () => {
    setup();
    await waitFor(() => expect(connections).toHaveLength(1));
    act(() => setVisibility('hidden'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    act(() => setVisibility('visible'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_PROGRESS_STREAM_HIDDEN_PAUSE_MS * 2);
    });
    expect(connections).toHaveLength(1);
    expect(latest().close).not.toHaveBeenCalled();
  });
});
