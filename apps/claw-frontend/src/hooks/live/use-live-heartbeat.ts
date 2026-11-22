import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { LIVE_HEARTBEAT_INTERVAL_MS } from '@/constants/live.constants';
import { liveRepository } from '@/repositories/live/live.repository';
import type {
  LiveHeartbeatInput,
  UseLiveHeartbeatOptions,
  UseLiveHeartbeatResult,
} from '@/types/live.types';

/**
 * Heartbeat every 10 s while AI runs, plus `sendNow` on play/pause/seek. Billing accrues only while
 * heartbeats arrive, so a failed one is surfaced (`hasError`), never retried in a tight loop.
 */
export function useLiveHeartbeat({
  sessionId,
  enabled,
  getSnapshot,
  onStatus,
  onUsage,
}: UseLiveHeartbeatOptions): UseLiveHeartbeatResult {
  const snapshotRef = useRef(getSnapshot);
  const statusRef = useRef(onStatus);
  const usageRef = useRef(onUsage);
  const { mutate, isError } = useMutation({
    mutationFn: (value: { id: string; input: LiveHeartbeatInput }) =>
      liveRepository.heartbeat(value.id, value.input),
    onSuccess: (result) => {
      statusRef.current(result.statusCode);
      usageRef.current(result.usage);
    },
    onError: (error: Error) => console.warn('Live heartbeat failed', error.message),
  });

  useEffect(() => {
    snapshotRef.current = getSnapshot;
    statusRef.current = onStatus;
    usageRef.current = onUsage;
  }, [getSnapshot, onStatus, onUsage]);
  const sendNow = useCallback((): void => {
    if (!enabled || sessionId === null) {
      return;
    }
    const input = snapshotRef.current();
    if (input !== null) {
      mutate({ id: sessionId, input });
    }
  }, [enabled, mutate, sessionId]);
  useEffect(() => {
    if (!enabled || sessionId === null) {
      return undefined;
    }
    const timer = setInterval(sendNow, LIVE_HEARTBEAT_INTERVAL_MS);
    return (): void => clearInterval(timer);
  }, [enabled, sendNow, sessionId]);

  return { sendNow, hasError: isError };
}
