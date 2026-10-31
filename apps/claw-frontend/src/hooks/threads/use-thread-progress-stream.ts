import type { ThreadGenerationProgress } from '@claw/shared-types';
import { useEffect } from 'react';

import { API_BASE_URL } from '@/constants';
import {
  THREAD_PROGRESS_STREAM_HIDDEN_PAUSE_MS,
  THREAD_PROGRESS_STREAM_JITTER_RATIO,
  THREAD_PROGRESS_STREAM_MAX_FALLBACK_RETRIES,
  THREAD_PROGRESS_STREAM_MAX_RECONNECTS,
  THREAD_PROGRESS_STREAM_RETRY_AFTER_FALLBACK_MS,
} from '@/constants/thread-generation-progress.constants';
import { SseConnectionHealth } from '@/enums';
import {
  ThreadProgressStreamMessageType,
  ThreadProgressStreamMode,
} from '@/enums/thread-progress-stream.enum';
import type {
  ThreadProgressStreamMessage,
  ThreadProgressStreamOptions,
} from '@/types/thread-generation-progress.types';
import { connectSse } from '@/utilities/sse.utility';
import {
  isStaleThreadProgress,
  isThreadProgressStreamRefusal,
  parseThreadProgressStreamMessage,
  threadProgressStreamUrl,
} from '@/utilities/thread-progress-stream.utility';

/**
 * Pushes the owner's progress into the same react-query entry the polling fills (ADR-201).
 *
 * One fetch-based SSE connection (the Authorization header is needed, so not EventSource) with
 * jittered back-off, Last-Event-ID resume and a short retry cap. When it cannot connect, or keeps
 * dropping, `onMode(ThreadProgressStreamMode.Fallback)` lets the caller's polling carry on exactly as before; the stream
 * is retried a few times later. A tab hidden for a minute closes its stream and opens a fresh one
 * (a full snapshot) when shown again. Snapshots older than the cache are ignored.
 */
export function useThreadProgressStream({
  publicationId,
  queryKey,
  queryClient,
  enabled,
  onMode,
  onApplied,
}: ThreadProgressStreamOptions): void {
  const cacheKey = queryKey.join('/');
  useEffect(() => {
    if (!enabled || publicationId === '' || typeof document === 'undefined') {
      return undefined;
    }
    const url = threadProgressStreamUrl(API_BASE_URL, publicationId);
    let connection: { close: () => void } | null = null;
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackRetries = 0;
    let finished = false;
    let paused = false;

    const apply = (message: ThreadProgressStreamMessage): void => {
      if (message.type === ThreadProgressStreamMessageType.Progress) {
        const current = queryClient.getQueryData<ThreadGenerationProgress>(queryKey);
        if (!isStaleThreadProgress(current, message.progress)) {
          queryClient.setQueryData(queryKey, message.progress);
          onApplied();
        }
      } else if (
        message.type === ThreadProgressStreamMessageType.Terminal ||
        message.type === ThreadProgressStreamMessageType.Gone
      ) {
        finished = true;
        connection?.close();
        connection = null;
        onMode(ThreadProgressStreamMode.Fallback);
      } else if (message.type === ThreadProgressStreamMessageType.Error) {
        stopForFallback(true);
      }
    };

    const stopForFallback = (retryLater: boolean): void => {
      connection?.close();
      connection = null;
      onMode(ThreadProgressStreamMode.Fallback);
      if (
        retryLater &&
        !finished &&
        fallbackRetries < THREAD_PROGRESS_STREAM_MAX_FALLBACK_RETRIES
      ) {
        fallbackRetries += 1;
        retryTimer = setTimeout(open, THREAD_PROGRESS_STREAM_RETRY_AFTER_FALLBACK_MS);
      }
    };

    function open(): void {
      retryTimer = undefined;
      if (finished || paused || connection !== null) {
        return;
      }
      onMode(ThreadProgressStreamMode.Connecting);
      connection = connectSse(
        url,
        {
          shouldReconnectAfterClose: () => !finished,
          onHealthChange: (health) => {
            if (health === SseConnectionHealth.LIVE) {
              onMode(ThreadProgressStreamMode.Live);
            } else if (health === SseConnectionHealth.RECONNECTING) {
              onMode(ThreadProgressStreamMode.Connecting);
            }
          },
          onMessage: (data) => {
            const message = parseThreadProgressStreamMessage(data);
            if (message !== null) {
              apply(message);
            }
          },
          onError: (error) => {
            if (isThreadProgressStreamRefusal(error)) {
              // Not the owner, or the Thread is gone: the plain poll reports it; never retry.
              finished = true;
              stopForFallback(false);
            } else if (connection !== null && /exhausted/.test(String(error))) {
              stopForFallback(true);
            }
          },
        },
        {
          maxAttempts: THREAD_PROGRESS_STREAM_MAX_RECONNECTS,
          jitterRatio: THREAD_PROGRESS_STREAM_JITTER_RATIO,
          resetAttemptsAfterLive: true,
        },
      );
    }

    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') {
        hiddenTimer ??= setTimeout(() => {
          hiddenTimer = undefined;
          paused = true;
          connection?.close();
          connection = null;
        }, THREAD_PROGRESS_STREAM_HIDDEN_PAUSE_MS);
        return;
      }
      if (hiddenTimer !== undefined) {
        clearTimeout(hiddenTimer);
        hiddenTimer = undefined;
      }
      if (paused) {
        paused = false;
        open();
      }
    };

    open();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      finished = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (hiddenTimer !== undefined) {
        clearTimeout(hiddenTimer);
      }
      if (retryTimer !== undefined) {
        clearTimeout(retryTimer);
      }
      connection?.close();
      connection = null;
    };
    // queryKey is represented by cacheKey; the callbacks are stable setters from the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicationId, enabled, cacheKey, queryClient]);
}
