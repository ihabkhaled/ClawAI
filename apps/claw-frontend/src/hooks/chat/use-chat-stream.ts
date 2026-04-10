import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@/constants';
import { StreamEventType } from '@/enums';
import type { FallbackAttemptInfo, SseConnection, StreamEvent } from '@/types';
import { connectSse, logger } from '@/utilities';

export function useChatStream(threadId: string, isActive: boolean) {
  const [fallbackAttempts, setFallbackAttempts] = useState<FallbackAttemptInfo[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const connectionRef = useRef<SseConnection | null>(null);

  const resetStream = useCallback((): void => {
    setFallbackAttempts([]);
    setStreamError(null);
  }, []);

  useEffect(() => {
    if (!isActive || !threadId) {
      return;
    }

    resetStream();

    const url = `${API_BASE_URL}/chat-messages/stream/${threadId}`;

    logger.debug({ component: 'chat', action: 'sse-connect', message: 'Connecting to SSE stream', details: { threadId } });

    const connection = connectSse(url, {
      onMessage: (data: string) => {
        try {
          const parsed = JSON.parse(data) as StreamEvent;

          if (parsed.type === StreamEventType.FALLBACK_ATTEMPT) {
            logger.warn({ component: 'chat', action: 'fallback-attempt', message: 'Provider fallback triggered', details: { threadId, failedProvider: parsed.failedProvider, nextProvider: parsed.nextProvider } });
            const attempt: FallbackAttemptInfo = {
              failedProvider: parsed.failedProvider ?? 'unknown',
              failedModel: parsed.failedModel ?? 'unknown',
              error: parsed.error ?? 'Unknown error',
              attempt: parsed.attempt ?? 0,
              totalCandidates: parsed.totalCandidates ?? 0,
              nextProvider: parsed.nextProvider,
              nextModel: parsed.nextModel,
              timestamp: Date.now(),
            };
            setFallbackAttempts((prev) => [...prev, attempt]);
          }

          if (parsed.type === StreamEventType.ERROR) {
            logger.error({ component: 'chat', action: 'stream-error', message: 'Stream error received', details: { threadId, error: parsed.error } });
            setStreamError(parsed.error ?? 'All providers failed');
          }
        } catch {
          // Ignore parse errors from SSE heartbeats
        }
      },
      onError: () => {
        logger.warn({ component: 'chat', action: 'sse-connection-error', message: 'SSE connection error, falling back to polling', details: { threadId } });
      },
    });

    connectionRef.current = connection;

    return () => {
      connection.close();
      connectionRef.current = null;
    };
  }, [threadId, isActive, resetStream]);

  // Clean up when no longer waiting
  useEffect(() => {
    if (!isActive && connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }
  }, [isActive]);

  return { fallbackAttempts, streamError, resetStream };
}
