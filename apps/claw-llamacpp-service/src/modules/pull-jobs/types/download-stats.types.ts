export interface DownloadStatsState {
  lastBytes: bigint;
  lastTimestampMs: number;
  smoothedSpeedBytesPerSec: number;
}

export interface DownloadStatsSnapshot {
  speedBytesPerSec: number;
  mbps: number;
  etaSeconds: number | null;
  elapsedMs: number;
}
