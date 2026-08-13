import { describe, expect, it, jest } from '@jest/globals';

import { AppConfig } from '../../../app/config/app.config';
import type { RedisClientPort } from '../types/redis-client.types';
import { RuntimeV2RedisOperation } from '../enums/runtime-v2-redis-operation.enum';
import { RedisService } from '../redis.service';

const client = (): jest.Mocked<RedisClientPort> => ({
  ping: jest.fn<RedisClientPort['ping']>(),
  get: jest.fn<RedisClientPort['get']>(),
  set: jest.fn<RedisClientPort['set']>(),
  del: jest.fn<RedisClientPort['del']>(),
  eval: jest.fn<RedisClientPort['eval']>(),
  evalRuntimeV2: jest.fn<RedisClientPort['evalRuntimeV2']>(),
  disconnect: jest.fn<RedisClientPort['disconnect']>(),
  quit: jest.fn<RedisClientPort['quit']>(),
});

describe('RedisService atomic boundary', () => {
  it('delegates compatibility operations and closes the client', async () => {
    const redisClient = client();
    redisClient.get.mockResolvedValue('value');
    redisClient.set.mockResolvedValue('OK');
    redisClient.del.mockResolvedValue(1);
    redisClient.quit.mockResolvedValue('OK');
    const service = new RedisService(redisClient);

    expect(service.getClient()).toBe(redisClient);
    await expect(service.get('key')).resolves.toBe('value');
    await expect(service.set('plain', 'value')).resolves.toBeUndefined();
    await expect(service.set('expiring', 'value', 60)).resolves.toBeUndefined();
    await expect(service.del('key')).resolves.toBeUndefined();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    expect(redisClient.set).toHaveBeenNthCalledWith(1, 'plain', 'value');
    expect(redisClient.set).toHaveBeenNthCalledWith(2, 'expiring', 'value', 'EX', 60);
  });

  it('passes only explicit scripts, keys and string arguments to Redis', async () => {
    const redisClient = client();
    const runtimeV2Client = client();
    runtimeV2Client.evalRuntimeV2.mockResolvedValue('["ok"]');
    const deadline = jest.spyOn(AppConfig, 'runtimeV2RedisDeadlineMs').mockReturnValue(250);
    const service = new RedisService(redisClient, runtimeV2Client);

    await expect(
      service.executeRuntimeV2({
        operation: RuntimeV2RedisOperation.START,
        keys: ['key:a', 'key:b'],
        arguments: ['safe'],
      }),
    ).resolves.toBe('["ok"]');
    expect(runtimeV2Client.evalRuntimeV2).toHaveBeenCalledWith(
      expect.stringContaining('runtime-v2:start'),
      2,
      ['key:a', 'key:b', 'safe'],
      250,
    );
    deadline.mockRestore();
  });

  it('propagates Redis loss without converting it into a fallback result', async () => {
    const redisClient = client();
    redisClient.evalRuntimeV2.mockRejectedValue(new Error('offline'));
    const service = new RedisService(redisClient);

    await expect(
      service.executeRuntimeV2({
        operation: RuntimeV2RedisOperation.CANCEL,
        keys: ['key:a'],
        arguments: [],
      }),
    ).rejects.toThrow('offline');
  });

  it('closes a distinct Runtime V2 client before the compatibility client', async () => {
    const redisClient = client();
    const runtimeV2Client = client();
    redisClient.quit.mockResolvedValue('OK');
    runtimeV2Client.quit.mockResolvedValue('OK');
    const service = new RedisService(redisClient, runtimeV2Client);

    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    expect(runtimeV2Client.quit).toHaveBeenCalledTimes(1);
    expect(redisClient.quit).toHaveBeenCalledTimes(1);
    expect(runtimeV2Client.quit.mock.invocationCallOrder[0]).toBeLessThan(
      redisClient.quit.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it('does not close the same client twice when it serves both roles', async () => {
    const redisClient = client();
    redisClient.quit.mockResolvedValue('OK');
    const service = new RedisService(redisClient, redisClient);

    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    expect(redisClient.quit).toHaveBeenCalledTimes(1);
  });
});
