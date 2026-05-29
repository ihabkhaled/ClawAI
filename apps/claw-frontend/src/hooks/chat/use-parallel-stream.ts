import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@/constants';
import { StreamEventType } from '@/enums';
import type { LaneStreamMap, SseConnection, StreamEvent } from '@/types';
import { connectSse } from '@/utilities';

// Subscribes to the compare thread's SSE channel and demultiplexes lane events
// (those carrying a laneId) into per-model live state keyed by `provider:model`.
// Content/reasoning are ref-buffered and flushed on lifecycle/metrics events.
export function useParallelStream(threadId: string | undefined, isActive: boolean) {
  const [lanes, setLanes] = useState<LaneStreamMap>({});
  const contentRefs = useRef<Record<string, string>>({});
  const reasoningRefs = useRef<Record<string, string>>({});
  const connectionRef = useRef<SseConnection | null>(null);

  const reset = useCallback((): void => {
    contentRefs.current = {};
    reasoningRefs.current = {};
    setLanes({});
  }, []);

  const handleEvent = useCallback((event: StreamEvent): void => {
    if (event.laneId === undefined) {
      return;
    }
    const key = `${event.provider ?? ''}:${event.model ?? ''}`;
    if (event.type === StreamEventType.CONTENT_DELTA) {
      contentRefs.current[key] = (contentRefs.current[key] ?? '') + (event.delta ?? '');
    }
    if (event.type === StreamEventType.REASONING_DELTA) {
      reasoningRefs.current[key] = (reasoningRefs.current[key] ?? '') + (event.reasoningDelta ?? '');
    }
    const isFlushEvent =
      event.type === StreamEventType.LIFECYCLE ||
      event.type === StreamEventType.METRICS ||
      event.type === StreamEventType.REASONING_DELTA ||
      event.type === StreamEventType.USAGE ||
      event.type === StreamEventType.ERROR;
    if (!isFlushEvent) {
      return;
    }
    const streaming = event.type !== StreamEventType.ERROR;
    setLanes((prev) => ({
      ...prev,
      [key]: {
        provider: event.provider ?? '',
        model: event.model ?? '',
        content: contentRefs.current[key] ?? '',
        reasoning: reasoningRefs.current[key] ?? '',
        reasoningVisibility: event.reasoningVisibility ?? prev[key]?.reasoningVisibility,
        stage: event.stage ?? prev[key]?.stage,
        metrics: event.metrics ?? prev[key]?.metrics,
        usage: event.usage ?? prev[key]?.usage,
        isStreaming: streaming,
      },
    }));
  }, []);

  useEffect(() => {
    if (!isActive || threadId === undefined || threadId.length === 0) {
      return;
    }
    reset();
    const connection = connectSse(`${API_BASE_URL}/chat-messages/stream/${threadId}`, {
      onMessage: (data: string) => {
        try {
          handleEvent(JSON.parse(data) as StreamEvent);
        } catch {
          // ignore non-JSON heartbeats
        }
      },
      onError: () => undefined,
    });
    connectionRef.current = connection;
    return () => {
      connection.close();
      connectionRef.current = null;
    };
  }, [threadId, isActive, reset, handleEvent]);

  return { lanes, reset };
}
