import { vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { type RedisService } from '../../../../infrastructure/redis/redis.service';
import { SessionRevocationCacheService } from '../session-revocation-cache.service';

const redisStub = (): { set: ReturnType<typeof vi.fn> } => ({
  set: vi.fn().mockResolvedValue(undefined),
});

const build = (redis: { set: ReturnType<typeof vi.fn> }, accessExpiry = '15m') => {
  vi.spyOn(AppConfig, 'get').mockReturnValue({
    JWT_ACCESS_EXPIRY: accessExpiry,
  } as ReturnType<typeof AppConfig.get>);
  return new SessionRevocationCacheService(redis as unknown as RedisService);
};

describe('SessionRevocationCacheService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // TD-033: a signed access token is not read from the database, so without
  // this entry a logout left it working until it expired.
  it('writes one key per session, expiring with the access token', async () => {
    const redis = redisStub();

    await build(redis).revoke(['session-1', 'session-2']);

    expect(redis.set).toHaveBeenCalledTimes(2);
    expect(redis.set).toHaveBeenCalledWith('auth:revoked-session:session-1', '1', 900);
    expect(redis.set).toHaveBeenCalledWith('auth:revoked-session:session-2', '1', 900);
  });

  it.each([
    ['30s', 30],
    ['15m', 900],
    ['2h', 7_200],
    ['1d', 86_400],
    ['nonsense', 900],
  ])('uses %s as a %i second TTL', async (expiry, ttl) => {
    const redis = redisStub();

    await build(redis, expiry).revoke(['session-1']);

    expect(redis.set).toHaveBeenCalledWith('auth:revoked-session:session-1', '1', ttl);
  });

  it('does nothing when nothing was revoked', async () => {
    const redis = redisStub();

    await build(redis).revoke([]);

    expect(redis.set).not.toHaveBeenCalled();
  });

  describe('revokeBatch (system-wide kill, ADR-204)', () => {
    const pipelineRedis = (exec: ReturnType<typeof vi.fn>) => {
      const set = vi.fn();
      const pipeline = vi.fn().mockReturnValue({ set, exec });
      return { redis: { getClient: () => ({ pipeline }) }, set, pipeline };
    };

    it('writes the same key and TTL as revoke, in one pipelined round trip', async () => {
      const exec = vi.fn().mockResolvedValue([]);
      const { redis, set, pipeline } = pipelineRedis(exec);
      vi.spyOn(AppConfig, 'get').mockReturnValue({ JWT_ACCESS_EXPIRY: '15m' } as ReturnType<
        typeof AppConfig.get
      >);

      const written = await new SessionRevocationCacheService(
        redis as unknown as RedisService,
      ).revokeBatch(['a', 'b']);

      expect(written).toBe(2);
      expect(pipeline).toHaveBeenCalledTimes(1);
      expect(exec).toHaveBeenCalledTimes(1);
      expect(set).toHaveBeenCalledWith('auth:revoked-session:a', '1', 'EX', 900);
      expect(set).toHaveBeenCalledWith('auth:revoked-session:b', '1', 'EX', 900);
    });

    it('splits a large set into bounded pipelines of 1000', async () => {
      const exec = vi.fn().mockResolvedValue([]);
      const { redis, pipeline } = pipelineRedis(exec);
      vi.spyOn(AppConfig, 'get').mockReturnValue({ JWT_ACCESS_EXPIRY: '15m' } as ReturnType<
        typeof AppConfig.get
      >);
      const ids = Array.from({ length: 2_500 }, (_, index) => `s${String(index)}`);

      const written = await new SessionRevocationCacheService(
        redis as unknown as RedisService,
      ).revokeBatch(ids);

      expect(written).toBe(2_500);
      expect(pipeline).toHaveBeenCalledTimes(3);
    });

    it('does nothing for an empty set and survives a failing batch', async () => {
      const exec = vi.fn().mockRejectedValue(new Error('redis down'));
      const { redis, pipeline } = pipelineRedis(exec);
      vi.spyOn(AppConfig, 'get').mockReturnValue({ JWT_ACCESS_EXPIRY: '15m' } as ReturnType<
        typeof AppConfig.get
      >);
      const service = new SessionRevocationCacheService(redis as unknown as RedisService);
      vi.spyOn(service['logger'], 'warn').mockImplementation(() => {});

      await expect(service.revokeBatch([])).resolves.toBe(0);
      expect(pipeline).not.toHaveBeenCalled();
      await expect(service.revokeBatch(['a'])).resolves.toBe(0);
    });
  });

  // The database is the truth, and the refresh path still refuses. A failed
  // cache write must not turn a logout into an error.
  it('never throws when Redis refuses the write', async () => {
    const redis = { set: vi.fn().mockRejectedValue(new Error('redis down')) };
    const service = build(redis);
    const warn = vi.spyOn(service['logger'], 'warn').mockImplementation(() => {});

    await expect(service.revoke(['session-1'])).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });
});
