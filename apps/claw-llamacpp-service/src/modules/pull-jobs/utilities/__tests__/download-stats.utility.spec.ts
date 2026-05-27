import { createStatsState, tickStats } from '../download-stats.utility';

describe('download-stats.utility', () => {
  describe('createStatsState', () => {
    it('initializes from given bytes and start time', () => {
      const startedAt = new Date(1_700_000_000_000);
      const state = createStatsState(100n, startedAt);
      expect(state.lastBytes).toBe(100n);
      expect(state.lastTimestampMs).toBe(1_700_000_000_000);
      expect(state.smoothedSpeedBytesPerSec).toBe(0);
    });
  });

  describe('tickStats', () => {
    it('computes speed and ETA on positive delta', () => {
      const startedAtMs = 1_700_000_000_000;
      const state = createStatsState(0n, new Date(startedAtMs));
      const snap = tickStats(state, 1_000_000n, 10_000_000n, startedAtMs, startedAtMs + 1000);
      // 1MB/1s = ~976.5 KB/s
      expect(snap.speedBytesPerSec).toBeGreaterThan(900_000);
      expect(snap.etaSeconds).not.toBeNull();
      expect(snap.etaSeconds).toBeGreaterThan(0);
      expect(snap.elapsedMs).toBe(1000);
    });

    it('returns null ETA when no remaining bytes', () => {
      const startedAtMs = 1_700_000_000_000;
      const state = createStatsState(0n, new Date(startedAtMs));
      const snap = tickStats(state, 100n, 100n, startedAtMs, startedAtMs + 1000);
      expect(snap.etaSeconds).toBeNull();
    });

    it('does not update state when delta is zero', () => {
      const startedAtMs = 1_700_000_000_000;
      const state = createStatsState(500n, new Date(startedAtMs));
      const snap = tickStats(state, 500n, 1000n, startedAtMs, startedAtMs + 1000);
      expect(snap.speedBytesPerSec).toBe(0);
      expect(snap.etaSeconds).toBeNull();
    });

    it('smooths speed over multiple ticks', () => {
      const startedAtMs = 1_700_000_000_000;
      const state = createStatsState(0n, new Date(startedAtMs));
      tickStats(state, 1_000_000n, 100_000_000n, startedAtMs, startedAtMs + 1000);
      const second = tickStats(
        state,
        3_000_000n,
        100_000_000n,
        startedAtMs,
        startedAtMs + 2000,
      );
      // Second tick is 2MB/s instant; smoothed blends with 1MB/s previous.
      expect(second.speedBytesPerSec).toBeGreaterThan(1_000_000);
      expect(second.speedBytesPerSec).toBeLessThan(2_500_000);
    });
  });
});
