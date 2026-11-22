import { LiveSessionReaperManager } from '../live-session-reaper.manager';

const NOW = 1_800_000_000_000;

function setup() {
  const sessions = { findStale: vi.fn().mockResolvedValue([{ id: 's1' }, { id: 's2' }]) };
  const detacher = { detach: vi.fn().mockResolvedValue(true) };
  const redis = { set: vi.fn().mockResolvedValue('OK'), eval: vi.fn().mockResolvedValue(1) };
  return {
    manager: new LiveSessionReaperManager(sessions as never, detacher as never, redis as never),
    sessions,
    detacher,
    redis,
  };
}

describe('LiveSessionReaperManager', () => {
  it('detaches sessions whose last heartbeat is older than 30 s, under an owned lock', async () => {
    const { manager, sessions, detacher, redis } = setup();
    await expect(manager.tick(NOW)).resolves.toBe(2);
    expect(sessions.findStale).toHaveBeenCalledWith(new Date(NOW - 30_000), 100);
    expect(detacher.detach).toHaveBeenCalledWith({ id: 's1' }, 'NETWORK_LOSS');
    const token = redis.set.mock.calls[0]?.[1] as string;
    expect(redis.set).toHaveBeenCalledWith('live:reaper:lock', token, 'PX', 15_000, 'NX');
    expect(redis.eval).toHaveBeenCalledWith(expect.any(String), 1, 'live:reaper:lock', token);
  });

  it('skips the sweep when another replica holds the lock', async () => {
    const { manager, sessions, redis } = setup();
    redis.set.mockResolvedValue(null);
    await expect(manager.tick(NOW)).resolves.toBe(0);
    expect(sessions.findStale).not.toHaveBeenCalled();
  });

  it('does not overlap a running sweep', async () => {
    const { manager, sessions } = setup();
    let release: () => void = () => {};
    sessions.findStale.mockReturnValue(new Promise((resolve) => (release = () => resolve([]))));
    const first = manager.tick(NOW);
    await expect(manager.tick(NOW)).resolves.toBe(0);
    release();
    await first;
  });

  it('keeps sweeping past one failed detach and survives a redis error', async () => {
    const { manager, detacher, redis } = setup();
    detacher.detach.mockRejectedValueOnce(new Error('x'));
    await expect(manager.tick(NOW)).resolves.toBe(1);
    redis.set.mockRejectedValue(new Error('redis down'));
    await expect(manager.tick(NOW)).resolves.toBe(0);
  });

  it('starts an unref timer and clears it on shutdown', () => {
    const { manager } = setup();
    manager.onModuleInit();
    manager.onModuleDestroy();
  });
});
