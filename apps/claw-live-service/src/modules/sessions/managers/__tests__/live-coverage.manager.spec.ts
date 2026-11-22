import { LiveHeartbeatState } from '../../../../common/enums/live-heartbeat-state.enum';
import { LiveCoverageManager } from '../live-coverage.manager';

const T = 1_800_000_000_000;

function setup(latest: { id: string; toAt: bigint } | null) {
  const repository = {
    latest: vi.fn().mockResolvedValue(latest),
    extend: vi.fn().mockResolvedValue(undefined),
    markGap: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue(undefined),
  };
  return { manager: new LiveCoverageManager(repository as never), repository };
}

const before = {
  id: 'sess1',
  runId: 'run1',
  lastHeartbeatAt: new Date(T),
  lastPlaybackAt: BigInt(T - 50_000),
} as never;

function body(playbackAt: number, extra: Record<string, unknown> = {}) {
  return { state: LiveHeartbeatState.PLAYING, playbackAt, atLiveEdge: false, ...extra } as never;
}

describe('LiveCoverageManager', () => {
  it('opens the first interval at the playback position', async () => {
    const { manager, repository } = setup(null);
    await manager.record(before, body(T), T + 10_000);
    expect(repository.open).toHaveBeenCalledWith('sess1', 'run1', BigInt(T));
  });

  it('extends the current interval while playback is continuous', async () => {
    const { manager, repository } = setup({ id: 'c1', toAt: BigInt(T) });
    await manager.record(before, body(T + 10_000), T + 10_000);
    expect(repository.extend).toHaveBeenCalledWith('c1', BigInt(T + 10_000));
    expect(repository.open).not.toHaveBeenCalled();
  });

  it('closes on a jump and opens a new interval, without a gap while still in DVR', async () => {
    const { manager, repository } = setup({ id: 'c1', toAt: BigInt(T) });
    await manager.record(
      before,
      body(T + 600_000, { atLiveEdge: true, seekableFromAt: T - 100_000 }),
      T + 10_000,
    );
    expect(repository.markGap).not.toHaveBeenCalled();
    expect(repository.open).toHaveBeenCalledWith('sess1', 'run1', BigInt(T + 600_000));
  });

  it('flags the closed interval as ending in a gap when the paused point left the DVR window', async () => {
    const { manager, repository } = setup({ id: 'c1', toAt: BigInt(T) });
    await manager.record(
      before,
      body(T + 600_000, { atLiveEdge: true, seekableFromAt: T }),
      T + 10_000,
    );
    expect(repository.markGap).toHaveBeenCalledWith('c1');
    expect(repository.open).toHaveBeenCalled();
  });

  it('does nothing for a session without a run', async () => {
    const { manager, repository } = setup(null);
    await manager.record({ ...(before as object), runId: null } as never, body(T), T);
    expect(repository.latest).not.toHaveBeenCalled();
  });
});
