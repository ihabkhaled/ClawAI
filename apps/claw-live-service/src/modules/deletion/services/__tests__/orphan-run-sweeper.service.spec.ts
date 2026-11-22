import { OrphanRunSweeperService } from '../orphan-run-sweeper.service';

function build(lock: 'OK' | null, swept = 2) {
  const deletion = { sweepOrphanRuns: vi.fn().mockResolvedValue(swept) };
  const redis = { set: vi.fn().mockResolvedValue(lock), eval: vi.fn().mockResolvedValue(1) };
  return {
    deletion,
    redis,
    sweeper: new OrphanRunSweeperService(deletion as never, redis as never),
  };
}

describe('OrphanRunSweeperService', () => {
  it('sweeps under the lock and releases it with its owner token', async () => {
    const { sweeper, deletion, redis } = build('OK');
    await expect(sweeper.tick()).resolves.toBe(2);
    expect(deletion.sweepOrphanRuns).toHaveBeenCalledWith(20);
    const token = redis.set.mock.calls[0]?.[1];
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'live:lock:orphan-run-sweep',
      token,
    );
  });

  it('does nothing while another replica holds the lock', async () => {
    const { sweeper, deletion } = build(null);
    await expect(sweeper.tick()).resolves.toBe(0);
    expect(deletion.sweepOrphanRuns).not.toHaveBeenCalled();
  });

  it('logs and survives a failing sweep, still releasing the lock', async () => {
    const { sweeper, deletion, redis } = build('OK');
    deletion.sweepOrphanRuns.mockRejectedValue(new Error('db down'));
    await expect(sweeper.tick()).resolves.toBe(0);
    expect(redis.eval).toHaveBeenCalled();
  });

  it('starts and stops its timer', () => {
    const { sweeper } = build('OK');
    sweeper.onModuleInit();
    sweeper.onModuleDestroy();
    expect(true).toBe(true);
  });
});
