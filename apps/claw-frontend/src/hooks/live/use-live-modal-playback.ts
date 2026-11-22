import { useCallback, useEffect, useRef } from 'react';

import type { LiveStatusCode } from '@/enums/live.enum';
import { useLiveHeartbeat } from '@/hooks/live/use-live-heartbeat';
import { useLivePlayer } from '@/hooks/live/use-live-player';
import type {
  LiveHeartbeatInput,
  LiveModalPlaybackCapture,
  LiveSessionUsage,
  UseLivePlayerResult,
} from '@/types/live.types';
import {
  toLiveCaptureHeartbeatInput,
  toLiveHeartbeatInput,
} from '@/utilities/live-session.utility';

/** Player plus heartbeat: play/pause/seek (or a capture start/stop) send a heartbeat at once, the timer covers the rest. */
export function useLiveModalPlayback(
  sessionId: string | null,
  hlsSrc: string | null,
  aiEnabled: boolean,
  onStatus: (status: LiveStatusCode) => void,
  onUsage: (usage: LiveSessionUsage) => void,
  capture: LiveModalPlaybackCapture,
): { player: UseLivePlayerResult; heartbeatError: boolean } {
  const sendRef = useRef<() => void>(() => undefined);
  const onPlaybackChange = useCallback((): void => sendRef.current(), []);
  const player = useLivePlayer({ hlsSrc, onPlaybackChange });
  const { readSnapshot } = player;
  const { isCapture, isCapturing } = capture;
  // A capture session has no player clock: its heartbeat is "now, at the live edge" (keeps it attached).
  const getSnapshot = useCallback(
    (): LiveHeartbeatInput | null =>
      isCapture
        ? toLiveCaptureHeartbeatInput(isCapturing, Date.now())
        : toLiveHeartbeatInput(readSnapshot()),
    [isCapture, isCapturing, readSnapshot],
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
  const { sendNow } = heartbeat;
  useEffect(() => {
    if (isCapture) {
      sendNow();
    }
  }, [isCapture, isCapturing, sendNow]);

  return { player, heartbeatError: heartbeat.hasError };
}
