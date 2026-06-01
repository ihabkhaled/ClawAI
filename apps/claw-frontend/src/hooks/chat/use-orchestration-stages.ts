import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@/constants';
import { StreamEventType, VisibleProgressStageStatus } from '@/enums';
import type {
  OrchestrationStage,
  SseConnection,
  StreamEvent,
  UseOrchestrationStagesResult,
} from '@/types';
import { connectSse, logger, mapVisibleStatusToOrchestrationStatus } from '@/utilities';

// Generic SSE -> OrchestrationStage[] projector shared by every
// orchestration lab page that adopts <OrchestrationPageShell>.
//
// chat-service folds orchestration_stage frames into the existing
// RESPONSE_STREAMING event type with a stable `stageId` + `label` +
// `status` + optional `actorName`. We filter on `stageId !== undefined`
// to avoid picking up the generic per-token RESPONSE_STREAMING frames
// the same channel carries during regular chat (those carry the token
// delta but no stageId).
//
// `errorMessage` is populated on a terminal ERROR event so the shell can
// render its Alert variant without each host page re-deriving it.
// `hasProgress` is `stages.length > 0` surfaced as a hint so the shell
// can swap the loading skeleton for the live timeline.
//
// Why a generic hook (vs the per-page variants like useBestOfNStream /
// useRolePackStages)? Pages that need bespoke stage assembly logic
// (e.g. role-pack's three pre-canned rows) still own their own hook.
// Pages that just want "show me whatever the server emitted" use this
// one — verify, escalation, consensus, repair, decompose, pipeline,
// cost-ensemble share the same projection.
export function useOrchestrationStages(
  threadId: string | null,
  isActive: boolean,
): UseOrchestrationStagesResult {
  const [stages, setStages] = useState<OrchestrationStage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const connectionRef = useRef<SseConnection | null>(null);

  const reset = useCallback((): void => {
    setStages([]);
    setErrorMessage(null);
  }, []);

  const upsertStage = useCallback((event: StreamEvent): void => {
    const stageId =
      event.stageId !== undefined && event.stageId !== ''
        ? event.stageId
        : `orchestration:${event.label ?? 'stage'}`;
    const next: OrchestrationStage = {
      id: stageId,
      label: event.label ?? event.type,
      status: mapVisibleStatusToOrchestrationStatus(event.status),
      detail: event.description,
      actorName: event.actorName,
    };
    setStages((prev) => {
      const idx = prev.findIndex((stage) => stage.id === stageId);
      if (idx === -1) {
        return [...prev, next];
      }
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  }, []);

  useEffect(() => {
    if (!isActive || threadId === null || threadId.length === 0) {
      return;
    }

    reset();
    const url = `${API_BASE_URL}/chat-messages/stream/${threadId}`;
    logger.debug({
      component: 'orchestration',
      action: 'sse-connect',
      message: 'Connecting to orchestration SSE stream',
      details: { threadId },
    });

    const connection = connectSse(url, {
      onMessage: (data: string) => {
        try {
          const parsed = JSON.parse(data) as StreamEvent;
          if (parsed.type === StreamEventType.ERROR) {
            const errorText =
              parsed.error !== undefined && parsed.error !== '' ? parsed.error : 'Stream error';
            setErrorMessage(errorText);
            // Mark any still-active stage as Failed so the timeline
            // reflects the terminal state visually.
            setStages((prev) =>
              prev.map((stage) =>
                stage.status ===
                mapVisibleStatusToOrchestrationStatus(VisibleProgressStageStatus.ACTIVE)
                  ? {
                      ...stage,
                      status: mapVisibleStatusToOrchestrationStatus(
                        VisibleProgressStageStatus.ERROR,
                      ),
                    }
                  : stage,
              ),
            );
            return;
          }
          if (parsed.type !== StreamEventType.RESPONSE_STREAMING) {
            return;
          }
          if (parsed.stageId === undefined || parsed.stageId === '') {
            return;
          }
          upsertStage(parsed);
        } catch {
          // Heartbeats and non-JSON frames are expected — ignore.
        }
      },
      onError: (error) => {
        logger.warn({
          component: 'orchestration',
          action: 'sse-error',
          message: 'Orchestration SSE connection error',
          details: { threadId, error: String(error) },
        });
      },
    });

    connectionRef.current = connection;

    return (): void => {
      connection.close();
      connectionRef.current = null;
    };
  }, [threadId, isActive, reset, upsertStage]);

  return { stages, hasProgress: stages.length > 0, errorMessage, reset };
}
