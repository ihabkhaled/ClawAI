import { useEffect, useRef, useState } from 'react';

import { DOWNLOAD_STATS_TICK_INTERVAL_MS } from '@/constants';
import type { DownloadSnapshotEntry, DownloadStats, PullJobResponse } from '@/types';

export function useDownloadStats(jobs: PullJobResponse[]): Map<string, DownloadStats> {
  const snapshots = useRef<Map<string, DownloadSnapshotEntry>>(new Map());
  const speeds = useRef<Map<string, number>>(new Map());
  const lastEta = useRef<Map<string, number>>(new Map());
  const lastEtaTime = useRef<Map<string, number>>(new Map());
  const [, setTick] = useState(0);

  const hasActive = jobs.some((j) => j.status === 'IN_PROGRESS' || j.status === 'PENDING');

  useEffect(() => {
    if (!hasActive) {
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), DOWNLOAD_STATS_TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasActive]);

  useEffect(() => {
    for (const job of jobs) {
      if (job.status !== 'IN_PROGRESS' && job.status !== 'PENDING') {
        snapshots.current.delete(job.id);
        speeds.current.delete(job.id);
        lastEta.current.delete(job.id);
        lastEtaTime.current.delete(job.id);
        continue;
      }

      const downloaded = job.downloadedBytes ?? 0;
      const now = Date.now();
      const prev = snapshots.current.get(job.id);

      if (prev && downloaded > prev.downloadedBytes) {
        const deltaBytes = downloaded - prev.downloadedBytes;
        const deltaMs = now - prev.timestamp;
        if (deltaMs > 500) {
          const instantSpeed = (deltaBytes / deltaMs) * 1000;
          const prevSpeed = speeds.current.get(job.id) ?? instantSpeed;
          const smoothed = prevSpeed * 0.3 + instantSpeed * 0.7;
          speeds.current.set(job.id, smoothed);
          snapshots.current.set(job.id, { downloadedBytes: downloaded, timestamp: now });

          const total = job.totalBytes ?? 0;
          const remaining = total - downloaded;
          if (smoothed > 0 && remaining > 0) {
            const eta = (remaining / smoothed) * 1000;
            lastEta.current.set(job.id, eta);
            lastEtaTime.current.set(job.id, now);
          }
        }
      } else if (!prev && downloaded > 0) {
        snapshots.current.set(job.id, { downloadedBytes: downloaded, timestamp: now });
        const startedAt = new Date(job.startedAt).getTime();
        const elapsed = now - startedAt;
        if (elapsed > 2000) {
          const avgSpeed = (downloaded / elapsed) * 1000;
          speeds.current.set(job.id, avgSpeed);
          const total = job.totalBytes ?? 0;
          const remaining = total - downloaded;
          if (avgSpeed > 0 && remaining > 0) {
            lastEta.current.set(job.id, (remaining / avgSpeed) * 1000);
            lastEtaTime.current.set(job.id, now);
          }
        }
      } else if (!prev) {
        snapshots.current.set(job.id, { downloadedBytes: 0, timestamp: now });
      }
    }
  }, [jobs]);

  const statsMap = new Map<string, DownloadStats>();
  const now = Date.now();

  for (const job of jobs) {
    if (job.status !== 'IN_PROGRESS' && job.status !== 'PENDING') {
      continue;
    }

    const startedAt = new Date(job.startedAt).getTime();
    const elapsedMs = now - startedAt;
    const speed = speeds.current.get(job.id) ?? 0;

    const baseEta = lastEta.current.get(job.id);
    const etaRecordedAt = lastEtaTime.current.get(job.id);
    let estimatedRemainingMs: number | null = null;

    if (baseEta !== undefined && etaRecordedAt !== undefined) {
      const tickedDown = baseEta - (now - etaRecordedAt);
      estimatedRemainingMs = tickedDown > 0 ? Math.round(tickedDown) : 0;
    }

    statsMap.set(job.id, {
      speedBytesPerSec: Math.round(speed),
      elapsedMs,
      estimatedRemainingMs,
    });
  }

  return statsMap;
}
