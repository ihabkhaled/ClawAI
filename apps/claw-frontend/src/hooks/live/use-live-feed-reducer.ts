import { useCallback, useReducer } from 'react';

import { LIVE_EMPTY_FEED_STATE } from '@/constants/live.constants';
import { LiveStatusCode, LiveStreamEventType } from '@/enums/live.enum';
import type { LiveFeedState, LiveSessionUsage, LiveStreamEvent } from '@/types/live.types';
import { applyLiveStreamEvent } from '@/utilities/live-feed-store.utility';

/** The modal's event store: every SSE event (and heartbeat status) goes through one reducer. */
export function useLiveFeedReducer(
  language: string,
  initialStatus: LiveStatusCode | null,
): {
  feed: LiveFeedState;
  dispatch: (event: LiveStreamEvent) => void;
  setStatus: (status: LiveStatusCode) => void;
  setUsage: (usage: LiveSessionUsage) => void;
} {
  const [feed, dispatch] = useReducer(
    (state: LiveFeedState, event: LiveStreamEvent) => applyLiveStreamEvent(state, event, language),
    { ...LIVE_EMPTY_FEED_STATE, status: initialStatus ?? LiveStatusCode.CONNECTING },
  );
  const setStatus = useCallback(
    (status: LiveStatusCode): void =>
      dispatch({ type: LiveStreamEventType.STATUS, runId: '', startAt: 0, status, data: {} }),
    [],
  );
  const setUsage = useCallback(
    (usage: LiveSessionUsage): void =>
      dispatch({ type: LiveStreamEventType.USAGE, runId: '', startAt: 0, data: usage }),
    [],
  );
  return { feed, dispatch, setStatus, setUsage };
}
