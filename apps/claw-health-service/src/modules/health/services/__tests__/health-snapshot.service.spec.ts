import { vi } from 'vitest';

import { METRICS_SNAPSHOT_TTL_MS } from '../../constants/metrics.constants';
import { AggregatedHealthStatus } from '../../enums/aggregated-health-status.enum';
import { HealthSnapshotService } from '../health-snapshot.service';
import { HealthService } from '../health.service';

const build = () => {
  const healthService = new HealthService();
  const checkAll = vi.spyOn(healthService, 'checkAll').mockResolvedValue({
    status: AggregatedHealthStatus.HEALTHY,
    timestamp: '2026-09-23T00:00:00.000Z',
    services: [],
    summary: { total: 0, up: 0, down: 0 },
  });
  return { snapshots: new HealthSnapshotService(healthService), checkAll };
};

describe('HealthSnapshotService', () => {
  it('serves every reader inside the TTL from one fan-out', async () => {
    const { snapshots, checkAll } = build();

    await snapshots.current(1_000);
    const again = await snapshots.current(1_000 + METRICS_SNAPSHOT_TTL_MS - 1);

    expect(checkAll).toHaveBeenCalledOnce();
    expect(again.takenAtMs).toBe(1_000);
  });

  it('refreshes once the snapshot reaches the TTL', async () => {
    const { snapshots, checkAll } = build();

    await snapshots.current(1_000);
    const fresh = await snapshots.current(1_000 + METRICS_SNAPSHOT_TTL_MS);

    expect(checkAll).toHaveBeenCalledTimes(2);
    expect(fresh.takenAtMs).toBe(1_000 + METRICS_SNAPSHOT_TTL_MS);
  });
});
