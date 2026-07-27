import type Redis from 'ioredis';

import { RedisService } from '../redis.service';

type MockRedis = {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  eval: jest.Mock;
  quit: jest.Mock;
};

function buildClient(): MockRedis {
  return {
    get: jest.fn(async () => null),
    set: jest.fn(async () => 'OK'),
    del: jest.fn(async () => 1),
    eval: jest.fn(async () => 1),
    quit: jest.fn(async () => 'OK'),
  };
}

describe('RedisService', () => {
  let client: MockRedis;
  let service: RedisService;

  beforeEach(() => {
    client = buildClient();
    service = new RedisService(client as unknown as Redis);
  });

  describe('get', () => {
    it('returns a stored value', async () => {
      client.get.mockResolvedValueOnce('value');
      await expect(service.get('k')).resolves.toBe('value');
      expect(client.get).toHaveBeenCalledWith('k');
    });

    it('returns null for a missing key', async () => {
      await expect(service.get('missing')).resolves.toBeNull();
    });
  });

  describe('set', () => {
    it('sets without a TTL when none is given', async () => {
      await service.set('k', 'v');
      expect(client.set).toHaveBeenCalledWith('k', 'v');
    });

    it('sets with an expiry when a TTL is given', async () => {
      await service.set('k', 'v', 60);
      expect(client.set).toHaveBeenCalledWith('k', 'v', 'EX', 60);
    });

    it('treats a zero TTL as an explicit expiry, not as absent', async () => {
      // `?? ` would swallow 0 here; the service uses an explicit undefined check.
      await service.set('k', 'v', 0);
      expect(client.set).toHaveBeenCalledWith('k', 'v', 'EX', 0);
    });
  });

  describe('acquireLock', () => {
    it('reports success when the lock is acquired', async () => {
      client.set.mockResolvedValueOnce('OK');
      await expect(service.acquireLock('lock', 'owner', 30)).resolves.toBe(true);
      expect(client.set).toHaveBeenCalledWith('lock', 'owner', 'EX', 30, 'NX');
    });

    it('reports failure when another replica already holds the lock', async () => {
      client.set.mockResolvedValueOnce(null);
      await expect(service.acquireLock('lock', 'owner', 30)).resolves.toBe(false);
    });
  });

  describe('releaseLock', () => {
    it('atomically deletes a lock only when the owner token matches', async () => {
      client.eval.mockResolvedValueOnce(1);

      await expect(service.releaseLock('lock', 'owner')).resolves.toBe(true);
      expect(client.eval).toHaveBeenCalledWith(expect.any(String), 1, 'lock', 'owner');
      expect(client.del).not.toHaveBeenCalled();
    });

    it('preserves a lock now owned by another replica', async () => {
      client.eval.mockResolvedValueOnce(0);

      await expect(service.releaseLock('lock', 'stale-owner')).resolves.toBe(false);
      expect(client.del).not.toHaveBeenCalled();
    });
  });

  it('exposes the raw client for atomic Lua scripts', () => {
    expect(service.getClient()).toBe(client);
  });

  it('quits the connection on shutdown', async () => {
    await service.onModuleDestroy();
    expect(client.quit).toHaveBeenCalledTimes(1);
  });
});
