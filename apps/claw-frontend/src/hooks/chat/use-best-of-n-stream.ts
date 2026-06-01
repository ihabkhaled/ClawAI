import { useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@/constants';
import { OrchestrationStageStatus, StreamEventType } from '@/enums';
import type { OrchestrationStage, SseConnection, StreamEvent } from '@/types';
import { connectSse, logger, mapVisibleStatusToOrchestrationStatus } from '@/utilities';

// Subscribes to the chat-service SSE channel for the given threadId and
// projects orchestration_stage events (carried over RESPONSE_STREAMING
// type by the chat-service) into the shared OrchestrationStage shape the
// OrchestrationStageTimeline consumes.
//
// Why a dedicated hook?
//   The chat thread page already has `useChatStream` which has its own
//   richer concerns (content/reasoning deltas, fallback attempts, judge
//   evaluation). The Best-of-N lab page only needs the stage projection —
//   pulling in `useChatStream` would also leak fallback/judge state into
//   the orchestration shell that has no place to render it.
//
// Reconnect strategy is handled by the shared `connectSse` utility — we
// just open the stream when `threadId` becomes non-null and close it on
// `DONE` / `ERROR` / unmount.
export function useBestOfNStream(threadId: string | null): {
  stages: OrchestrationStage[];
  hasProgress: boolean;
  streamError: string | null;
} {
  const [stages, setStages] = useState<OrchestrationStage[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const connectionRef = useRef<SseConnection | null>(null);

  useEffect(() => {
    if (threadId === null || threadId === '') {
      // Reset on threadId clear so a second submission starts fresh.
      setStages([]);
      setStreamError(null);
      return;
    }

    setStages([]);
    setStreamError(null);

    const url = `${API_BASE_URL}/chat-messages/stream/${threadId}`;

    logger.debug({
      component: 'best-of-n',
      action: 'sse-connect',
      message: 'Subscribing to orchestration stage stream',
      details: { threadId },
    });

    const connection = connectSse(url, {
      onMessage: (data: string): void => {
        try {
          const parsed = JSON.parse(data) as StreamEvent;

          // The chat-service folds orchestration_stage into the
          // RESPONSE_STREAMING type with a stageId + label + status.
          if (parsed.type === StreamEventType.RESPONSE_STREAMING) {
            const stageId =
              parsed.stageId !== undefined && parsed.stageId !== ''
                ? parsed.stageId
                : `${parsed.type}:${parsed.label ?? 'stage'}`;
            const nextStage: OrchestrationStage = {
              id: stageId,
              label: parsed.label ?? stageId,
              status: mapVisibleStatusToOrchestrationStatus(parsed.status),
              detail: parsed.description,
              actorName: parsed.actorName,
            };
            setStages((prev) => {
              const existingIndex = prev.findIndex((stage) => stage.id === stageId);
              if (existingIndex === -1) {
                return [...prev, nextStage];
              }
              const updated = [...prev];
              updated[existingIndex] = nextStage;
              return updated;
            });
          }

          if (parsed.type === StreamEventType.ERROR) {
            const message = parsed.error ?? 'Stream error';
            logger.error({
              component: 'best-of-n',
              action: 'sse-error-event',
              message,
              details: { threadId },
            });
            setStreamError(message);
            setStages((prev) =>
              prev.map((stage) =>
                stage.status === OrchestrationStageStatus.Active
                  ? { ...stage, status: OrchestrationStageStatus.Failed }
                  : stage,
              ),
            );
          }
        } catch (error: unknown) {
          // Ignore SSE heartbeats / non-JSON payloads.
          logger.debug({
            component: 'best-of-n',
            action: 'sse-parse-skip',
            message: 'Skipping non-JSON SSE payload',
            details: { error: (error as Error).message },
          });
        }
      },
      onError: (error: unknown): void => {
        logger.warn({
          component: 'best-of-n',
          action: 'sse-connection-error',
          message: 'SSE connection error',
          details: { threadId, error: (error as Error).message },
        });
      },
    });

    connectionRef.current = connection;

    return (): void => {
      connection.close();
      connectionRef.current = null;
    };
  }, [threadId]);

  return {
    stages,
    hasProgress: stages.length > 0,
    streamError,
  };
}
