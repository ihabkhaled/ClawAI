import { describe, expect, it, jest } from '@jest/globals';
import Redis from 'ioredis';

import { RedisClientAdapter } from '../redis-client.adapter';

describe('RedisClientAdapter', () => {
  it('delegates lifecycle, keys, writes, deletion and evaluation exactly', async () => {
    const client = new Redis({ lazyConnect: true });
    const ping = jest.spyOn(client, 'ping').mockResolvedValue('PONG');
    const get = jest.spyOn(client, 'get').mockResolvedValue('value');
    const set = jest.spyOn(client, 'set').mockResolvedValue('OK');
    const del = jest.spyOn(client, 'del').mockResolvedValue(2);
    const evaluate = jest.spyOn(client, 'eval').mockResolvedValue(['OK', 'ack']);
    const disconnect = jest.spyOn(client, 'disconnect').mockImplementation(() => {});
    const quit = jest.spyOn(client, 'quit').mockResolvedValue('OK');
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.ping()).resolves.toBe('PONG');
    await expect(adapter.get('key')).resolves.toBe('value');
    await expect(adapter.set('plain', 'value')).resolves.toBe('OK');
    await expect(adapter.set('expiring', 'value', 'EX', 60)).resolves.toBe('OK');
    await expect(adapter.del('one', 'two')).resolves.toBe(2);
    await expect(adapter.eval('script', 1, 'key', 'argument')).resolves.toEqual(['OK', 'ack']);
    await expect(adapter.evalRuntimeV2('script', 1, ['key', 'argument'], 100)).resolves.toEqual([
      'OK',
      'ack',
    ]);
    adapter.disconnect(false);
    await expect(adapter.quit()).resolves.toBe('OK');

    expect(ping).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('key');
    expect(set).toHaveBeenCalledTimes(2);
    expect(del).toHaveBeenCalledTimes(1);
    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(disconnect).toHaveBeenCalledWith(false);
    expect(quit).toHaveBeenCalledTimes(1);
  });

  it('disconnects the dedicated Runtime V2 client so a timed-out command cannot execute later', async () => {
    const client = new Redis({ lazyConnect: true });
    jest.spyOn(client, 'eval').mockImplementation(() => new Promise(() => {}));
    const disconnect = jest.spyOn(client, 'disconnect').mockImplementation(() => {});
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.evalRuntimeV2('script', 1, ['key'], 20)).rejects.toThrow(
      'Runtime V2 Redis deadline exceeded',
    );
    expect(disconnect).toHaveBeenCalledWith(true);
  });

  it('caps an oversized Runtime V2 deadline before scheduling its timer', async () => {
    jest.useFakeTimers();
    const schedule = jest.spyOn(globalThis, 'setTimeout');
    const client = new Redis({ lazyConnect: true });
    jest.spyOn(client, 'eval').mockResolvedValue('OK');
    const adapter = new RedisClientAdapter(client);

    await expect(
      adapter.evalRuntimeV2('script', 1, ['key'], Number.MAX_SAFE_INTEGER),
    ).resolves.toBe('OK');
    expect(schedule).toHaveBeenLastCalledWith(expect.any(Function), 10_000);

    schedule.mockRestore();
    jest.useRealTimers();
  });

  it.each([Number.NaN, -1])('uses the hard cap for an invalid deadline %p', async (deadlineMs) => {
    jest.useFakeTimers();
    const schedule = jest.spyOn(globalThis, 'setTimeout');
    const client = new Redis({ lazyConnect: true });
    jest.spyOn(client, 'eval').mockResolvedValue('OK');
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.evalRuntimeV2('script', 1, ['key'], deadlineMs)).resolves.toBe('OK');
    expect(schedule).toHaveBeenLastCalledWith(expect.any(Function), 10_000);

    schedule.mockRestore();
    jest.useRealTimers();
  });

  it('disconnects and preserves Runtime V2 Redis errors', async () => {
    const client = new Redis({ lazyConnect: true });
    const failure = new Error('redis unavailable');
    jest.spyOn(client, 'eval').mockRejectedValue(failure);
    const disconnect = jest.spyOn(client, 'disconnect').mockImplementation(() => {});
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.evalRuntimeV2('script', 1, ['key'], 100)).rejects.toBe(failure);
    expect(disconnect).toHaveBeenCalledWith(true);
  });

  it('normalizes non-Error Runtime V2 Redis rejections', async () => {
    const client = new Redis({ lazyConnect: true });
    jest.spyOn(client, 'eval').mockRejectedValue('offline');
    jest.spyOn(client, 'disconnect').mockImplementation(() => {});
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.evalRuntimeV2('script', 1, ['key'], 100)).rejects.toThrow(
      'Runtime V2 Redis command failed',
    );
  });

  it('ignores a late Redis resolution after the deadline', async () => {
    jest.useFakeTimers();
    const client = new Redis({ lazyConnect: true });
    let resolveEvaluation: (value: unknown) => void = () => {};
    jest.spyOn(client, 'eval').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveEvaluation = resolve;
        }),
    );
    jest.spyOn(client, 'disconnect').mockImplementation(() => {});
    const adapter = new RedisClientAdapter(client);
    const result = adapter.evalRuntimeV2('script', 1, ['key'], 10);
    const rejection = expect(result).rejects.toThrow('Runtime V2 Redis deadline exceeded');

    await jest.advanceTimersByTimeAsync(10);
    await rejection;
    resolveEvaluation('late');
    await Promise.resolve();
    jest.useRealTimers();
  });

  it('ignores a late Redis rejection after the deadline', async () => {
    jest.useFakeTimers();
    const client = new Redis({ lazyConnect: true });
    let rejectEvaluation: (reason: unknown) => void = () => {};
    jest.spyOn(client, 'eval').mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectEvaluation = reject;
        }),
    );
    jest.spyOn(client, 'disconnect').mockImplementation(() => {});
    const adapter = new RedisClientAdapter(client);
    const result = adapter.evalRuntimeV2('script', 1, ['key'], 10);
    const rejection = expect(result).rejects.toThrow('Runtime V2 Redis deadline exceeded');

    await jest.advanceTimersByTimeAsync(10);
    await rejection;
    rejectEvaluation(new Error('late'));
    await Promise.resolve();
    jest.useRealTimers();
  });

  it('makes a settled deadline callback a no-op', async () => {
    jest.useFakeTimers();
    const clearTimer = jest.spyOn(globalThis, 'clearTimeout').mockImplementation(() => {});
    const client = new Redis({ lazyConnect: true });
    jest.spyOn(client, 'eval').mockResolvedValue('OK');
    const disconnect = jest.spyOn(client, 'disconnect').mockImplementation(() => {});
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.evalRuntimeV2('script', 1, ['key'], 10)).resolves.toBe('OK');
    await jest.advanceTimersByTimeAsync(10);
    expect(disconnect).not.toHaveBeenCalled();
    clearTimer.mockRestore();
    jest.useRealTimers();
  });

  it('uses a plain write when the expiration arguments are incomplete', async () => {
    const client = new Redis({ lazyConnect: true });
    const set = jest.spyOn(client, 'set').mockResolvedValue('OK');
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.set('key', 'value', 'EX')).resolves.toBe('OK');
    expect(set.mock.calls[0]).toEqual(['key', 'value']);
  });
});
