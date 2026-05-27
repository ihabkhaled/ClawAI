import { SPEED_SMOOTHING_ALPHA } from '../constants/pull-job.constants';
import type {
  DownloadStatsSnapshot,
  DownloadStatsState,
} from '../types/download-stats.types';

export function createStatsState(initialBytes: bigint, startedAt: Date): DownloadStatsState {
  return {
    lastBytes: initialBytes,
    lastTimestampMs: startedAt.getTime(),
    smoothedSpeedBytesPerSec: 0,
  };
}

export function tickStats(
  state: DownloadStatsState,
  currentBytes: bigint,
  totalBytes: bigint,
  startedAtMs: number,
  nowMs: number = Date.now(),
): DownloadStatsSnapshot {
  const deltaBytes = currentBytes > state.lastBytes ? currentBytes - state.lastBytes : 0n;
  const deltaMs = nowMs - state.lastTimestampMs;
  if (deltaMs > 0 && deltaBytes > 0n) {
    const instantSpeed = Number(deltaBytes) / (deltaMs / 1000);
    state.smoothedSpeedBytesPerSec =
      state.smoothedSpeedBytesPerSec > 0
        ? state.smoothedSpeedBytesPerSec * SPEED_SMOOTHING_ALPHA +
          instantSpeed * (1 - SPEED_SMOOTHING_ALPHA)
        : instantSpeed;
    state.lastBytes = currentBytes;
    state.lastTimestampMs = nowMs;
  }

  const speed = state.smoothedSpeedBytesPerSec;
  const remaining = totalBytes > currentBytes ? Number(totalBytes - currentBytes) : 0;
  const etaSeconds = speed > 0 && remaining > 0 ? Math.round(remaining / speed) : null;
  const elapsedMs = nowMs - startedAtMs;

  return {
    speedBytesPerSec: Math.round(speed),
    mbps: Number((speed / (1024 * 1024)).toFixed(2)),
    etaSeconds,
    elapsedMs,
  };
}
