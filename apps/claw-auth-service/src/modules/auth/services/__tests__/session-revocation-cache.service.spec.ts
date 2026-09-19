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
