import { useEffect, useRef, useState } from 'react';

import { LIVE_SSE_OPTIONS, LIVE_TERMINAL_STATUSES } from '@/constants/live.constants';
import type { LiveStatusCode } from '@/enums/live.enum';
import { SseConnectionHealth } from '@/enums/sse-connection-health.enum';
import { useLiveFeedReducer } from '@/hooks/live/use-live-feed-reducer';
import type { UseLiveStreamResult } from '@/types/live.types';
import { parseLiveStreamEvent } from '@/utilities/live-feed-store.utility';
import { liveStreamUrl } from '@/utilities/live-session.utility';
import { connectSse } from '@/utilities/sse.utility';

/**
 * `GET /sessions/:id/stream` through `connectSse` (bearer header, Last-Event-ID replay, jittered
 * back-off). Stops reconnecting once a terminal status arrived; a clean close before that is a drop.
 */
export function useLiveStream(
  sessionId: string | null,
  enabled: boolean,
  language: string,
  initialStatus: LiveStatusCode | null,
): UseLiveStreamResult {
  const { feed, dispatch, setStatus, setUsage } = useLiveFeedReducer(language, initialStatus);
  const [health, setHealth] = useState<SseConnectionHealth | null>(null);
  const statusRef = useRef(feed.status);

  useEffect(() => {
    statusRef.current = feed.status;
  }, [feed.status]);
  useEffect(() => {
    if (!enabled || sessionId === null) {
      return undefined;
    }
    const connection = connectSse(
      liveStreamUrl(sessionId),
      {
        onMessage: (raw) => {
          const event = parseLiveStreamEvent(raw);
          if (event !== null) {
            dispatch(event);
          }
        },
        onError: (error) => console.warn('Live feed stream error', error),
        onHealthChange: setHealth,
        shouldReconnectAfterClose: () => !LIVE_TERMINAL_STATUSES.has(statusRef.current),
      },
      LIVE_SSE_OPTIONS,
    );
    return (): void => connection.close();
  }, [dispatch, enabled, sessionId]);

  return {
    feed,
    isReconnecting: health === SseConnectionHealth.RECONNECTING,
    isLost: health === SseConnectionHealth.LOST,
    setStatus,
    setUsage,
  };
}
