import { describe, expect, it, vi } from 'vitest';

import type { BoardMaintenanceRepository } from '../repositories/board-maintenance.repository';
import { BoardMaintenanceService } from '../services/board-maintenance.service';
import type { BoardMaintenanceCounts } from '../types/board.types';

const counts: BoardMaintenanceCounts = { wordsUpserted: 2, wordsRemoved: 1, trendingUpdated: 5 };

function service(refresh: () => Promise<BoardMaintenanceCounts | null>): {
  svc: BoardMaintenanceService;
  refresh: ReturnType<typeof vi.fn>;
} {
  const fn = vi.fn(refresh);
  const repo = { refresh: fn } as unknown as BoardMaintenanceRepository;
  return { svc: new BoardMaintenanceService(repo), refresh: fn };
}

describe('BoardMaintenanceService', () => {
  it('returns the counts of one pass', async () => {
    const { svc } = service(() => Promise.resolve(counts));
    expect(await svc.runOnce()).toEqual(counts);
  });

  it('returns null when another replica holds the turn', async () => {
    const { svc } = service(() => Promise.resolve(null));
    expect(await svc.runOnce()).toBeNull();
  });

  it('never throws and runs again after a failure', async () => {
    const { svc, refresh } = service(() => Promise.reject(new Error('db down')));
    expect(await svc.runOnce()).toBeNull();
    refresh.mockResolvedValueOnce(counts);
    expect(await svc.runOnce()).toEqual(counts);
  });

  it('never overlaps itself', async () => {
    let release: ((value: BoardMaintenanceCounts) => void) | undefined;
    const { svc, refresh } = service(
      () =>
        new Promise<BoardMaintenanceCounts>((resolve) => {
          release = resolve;
        }),
    );
    const first = svc.runOnce();
    expect(await svc.runOnce()).toBeNull();
    release?.(counts);
    expect(await first).toEqual(counts);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('schedules on init and stops on destroy', () => {
    vi.useFakeTimers();
    const { svc, refresh } = service(() => Promise.resolve(counts));
    svc.onModuleInit();
    vi.advanceTimersByTime(120_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    svc.onModuleDestroy();
    vi.advanceTimersByTime(240_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
