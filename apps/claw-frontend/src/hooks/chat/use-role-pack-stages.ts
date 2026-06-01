import { useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import type { SseConnection, StreamEvent } from '@/types/chat.types';
import type { OrchestrationStage } from '@/types/orchestration.types';
import type { UseRolePackStagesResult } from '@/types/role-pack-stages.types';
import {
  applyStreamEventToRolePackStages,
  buildInitialRolePackStages,
  connectSse,
  logger,
} from '@/utilities';

// Subscribes to /chat-messages/stream/:threadId once a threadId is known,
// then maps incoming SSE events into the three-row role-pack pipeline
// (submitting → running-roles → synthesizing). The hook owns no result
// state — the caller still polls `useRolePackPoll` for the final
// assistant message; this hook only powers the OrchestrationStageTimeline.
//
// When `threadId === null` (before submit) the hook returns an empty
// list. When `enabled === false` (after the result is ready or after an
// error) the hook tears down the SSE connection eagerly. This keeps the
// browser from holding a long-lived SSE socket open after the run.
export function useRolePackStages(
  threadId: string | null,
  enabled: boolean,
): UseRolePackStagesResult {
  const { t } = useTranslation();
  const [stages, setStages] = useState<OrchestrationStage[]>([]);
  const connectionRef = useRef<SseConnection | null>(null);

  useEffect(() => {
    if (threadId === null || !enabled) {
      if (connectionRef.current !== null) {
        connectionRef.current.close();
        connectionRef.current = null;
      }
      return;
    }

    setStages(buildInitialRolePackStages(t));

    const url = `${API_BASE_URL}/chat-messages/stream/${threadId}`;
    logger.debug({
      component: 'role-pack-stages',
      action: 'sse-connect',
      message: 'Connecting to role-pack SSE stream',
      details: { threadId },
    });

    const connection = connectSse(url, {
      onMessage: (data: string) => {
        try {
          const parsed = JSON.parse(data) as StreamEvent;
          setStages((current) => applyStreamEventToRolePackStages(current, parsed));
        } catch {
          // Heartbeat / non-JSON frames are ignored.
        }
      },
      onError: () => {
        logger.warn({
          component: 'role-pack-stages',
          action: 'sse-error',
          message: 'Role-pack SSE connection error',
          details: { threadId },
        });
      },
    });
    connectionRef.current = connection;

    return () => {
      connection.close();
      connectionRef.current = null;
    };
  }, [threadId, enabled, t]);

  return { stages };
}
