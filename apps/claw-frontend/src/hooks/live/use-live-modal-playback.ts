import { useCallback, useEffect, useRef } from 'react';

import type { LiveStatusCode } from '@/enums/live.enum';
import { useLiveHeartbeat } from '@/hooks/live/use-live-heartbeat';
import { useLivePlayer } from '@/hooks/live/use-live-player';
import type { LiveHeartbeatInput, LiveSessionUsage, UseLivePlayerResult } from '@/types/live.types';
import { toLiveHeartbeatInput } from '@/utilities/live-session.utility';

/** Player plus heartbeat: play/pause/seek send a heartbeat at once, the timer covers the rest. */
export function useLiveModalPlayback(
  sessionId: string | null,
  hlsSrc: string | null,
  aiEnabled: boolean,
  onStatus: (status: LiveStatusCode) => void,
  onUsage: (usage: LiveSessionUsage) => void,
): { player: UseLivePlayerResult; heartbeatError: boolean } {
  const sendRef = useRef<() => void>(() => undefined);
  const onPlaybackChange = useCallback((): void => sendRef.current(), []);
  const player = useLivePlayer({ hlsSrc, onPlaybackChange });
  const { readSnapshot } = player;
  const getSnapshot = useCallback(
    (): LiveHeartbeatInput | null => toLiveHeartbeatInput(readSnapshot()),
    [readSnapshot],
  );
  const heartbeat = useLiveHeartbeat({
    sessionId,
    enabled: aiEnabled,
    getSnapshot,
    onStatus,
    onUsage,
  });

  useEffect(() => {
    sendRef.current = heartbeat.sendNow;
  }, [heartbeat.sendNow]);

  return { player, heartbeatError: heartbeat.hasError };
}
