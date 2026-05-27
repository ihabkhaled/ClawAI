import type {
  DownloadStatsSnapshot,
  DownloadStatsState,
} from '../types/download-stats.types';
import { SPEED_SMOOTHING_ALPHA } from '../constants/pull-resilience.constants';

export function createStatsState(initialBytes: number, startedAtMs: number): DownloadStatsState {
  return {
    lastBytes: initialBytes,
    lastTimestampMs: startedAtMs,
    smoothedSpeedBytesPerSec: 0,
  };
}

export function tickStats(
  state: DownloadStatsState,
  currentBytes: number,
  totalBytes: number,
  startedAtMs: number,
  nowMs: number = Date.now(),
): DownloadStatsSnapshot {
  const deltaBytes = currentBytes > state.lastBytes ? currentBytes - state.lastBytes : 0;
  const deltaMs = nowMs - state.lastTimestampMs;
  if (deltaMs > 0 && deltaBytes > 0) {
    const instantSpeed = deltaBytes / (deltaMs / 1000);
    state.smoothedSpeedBytesPerSec =
      state.smoothedSpeedBytesPerSec > 0
        ? state.smoothedSpeedBytesPerSec * SPEED_SMOOTHING_ALPHA +
          instantSpeed * (1 - SPEED_SMOOTHING_ALPHA)
        : instantSpeed;
    state.lastBytes = currentBytes;
    state.lastTimestampMs = nowMs;
  }

  const speed = state.smoothedSpeedBytesPerSec;
  const remaining = totalBytes > currentBytes ? totalBytes - currentBytes : 0;
  const etaSeconds = speed > 0 && remaining > 0 ? Math.round(remaining / speed) : null;
  const elapsedMs = nowMs - startedAtMs;

  return {
    speedBytesPerSec: Math.round(speed),
    mbps: Number((speed / (1024 * 1024)).toFixed(2)),
    etaSeconds,
    elapsedMs,
  };
}
