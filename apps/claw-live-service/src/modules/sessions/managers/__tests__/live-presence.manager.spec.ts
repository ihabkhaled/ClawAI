import { LivePresenceManager } from '../live-presence.manager';

const T = 1_800_000_000_000;

/** In-memory Redis subset with a faithful compare-and-set for the accrual script. */
function fakeRedis() {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    eval: vi.fn(
      async (_script: string, _keys: number, key: string, expected: string, next: string) => {
        if ((store.get(key) ?? '') !== expected) return 0;
        store.set(key, next);
        return 1;
      },
    ),
    zadd: vi.fn().mockResolvedValue(1),
    zrem: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
  };
}

describe('LivePresenceManager', () => {
  it('records presence in the run ZSET', async () => {
    const redis = fakeRedis();
    const manager = new LivePresenceManager(redis as never);
    await manager.touch('run1', 'sess1', T);
    expect(redis.zadd).toHaveBeenCalledWith('live:presence:run1', T, 'sess1');
    await manager.remove('run1', 'sess1');
    expect(redis.zrem).toHaveBeenCalledWith('live:presence:run1', 'sess1');
  });

  it('counts hourly starts and sets the window TTL on the first', async () => {
    const redis = fakeRedis();
    const manager = new LivePresenceManager(redis as never);
    await expect(manager.countHourlyStart('u1', T)).resolves.toBe(1);
    expect(redis.expire).toHaveBeenCalledWith(
      expect.stringMatching(/^live:sessions:hour:u1:/u),
      3600,
    );
  });

  it('dedupes two devices of one user on one run through the shared mark', async () => {
    const redis = fakeRedis();
    const manager = new LivePresenceManager(redis as never);
    const a = await manager.accrue('u1', 'run1', T, T + 10_000);
    const b = await manager.accrue('u1', 'run1', T + 5000, T + 15_000);
    expect(a).toBe(10);
    expect(b).toBe(5);
    expect(redis.store.get('live:accrual:u1:run1')).toBe(String(T + 15_000));
  });

  it('retries the compare-and-set when another device moved the mark', async () => {
    const redis = fakeRedis();
    const manager = new LivePresenceManager(redis as never);
    redis.eval.mockResolvedValueOnce(0);
    await expect(manager.accrue('u1', 'run1', T, T + 10_000)).resolves.toBe(10);
    expect(redis.eval).toHaveBeenCalledTimes(2);
  });

  it('gives up after the attempt limit and accrues nothing', async () => {
    const redis = fakeRedis();
    redis.eval.mockResolvedValue(0);
    const manager = new LivePresenceManager(redis as never);
    await expect(manager.accrue('u1', 'run1', T, T + 10_000)).resolves.toBe(0);
  });

  it('accrues nothing after a heartbeat gap', async () => {
    const redis = fakeRedis();
    const manager = new LivePresenceManager(redis as never);
    await expect(manager.accrue('u1', 'run1', T, T + 20_000)).resolves.toBe(0);
    expect(redis.eval).not.toHaveBeenCalled();
  });
});
