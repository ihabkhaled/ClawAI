import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@/constants';
import { StreamEventType } from '@/enums';
import type { FallbackAttemptInfo, StreamEvent } from '@/types';
import { getAccessToken } from '@/utilities';

export function useChatStream(threadId: string, isActive: boolean) {
  const [fallbackAttempts, setFallbackAttempts] = useState<FallbackAttemptInfo[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const resetStream = useCallback((): void => {
    setFallbackAttempts([]);
    setStreamError(null);
  }, []);

  useEffect(() => {
    if (!isActive || !threadId) {
      return;
    }

    resetStream();

    const token = getAccessToken();
    const url = `${API_BASE_URL}/chat-messages/stream/${threadId}?token=${encodeURIComponent(token ?? '')}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as StreamEvent;

        if (data.type === StreamEventType.FALLBACK_ATTEMPT) {
          const attempt: FallbackAttemptInfo = {
            failedProvider: data.failedProvider ?? 'unknown',
            failedModel: data.failedModel ?? 'unknown',
            error: data.error ?? 'Unknown error',
            attempt: data.attempt ?? 0,
            totalCandidates: data.totalCandidates ?? 0,
            nextProvider: data.nextProvider,
            nextModel: data.nextModel,
            timestamp: Date.now(),
          };
          setFallbackAttempts((prev) => [...prev, attempt]);
        }

        if (data.type === StreamEventType.ERROR) {
          setStreamError(data.error ?? 'All providers failed');
        }

        if (data.type === StreamEventType.DONE) {
          // Connection will be cleaned up by the isActive toggle
        }
      } catch {
        // Ignore parse errors from SSE heartbeats
      }
    };

    eventSource.onerror = () => {
      // SSE reconnect is automatic; ignore transient errors
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [threadId, isActive, resetStream]);

  // Clean up when no longer waiting
  useEffect(() => {
    if (!isActive && eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, [isActive]);

  return { fallbackAttempts, streamError, resetStream };
}
