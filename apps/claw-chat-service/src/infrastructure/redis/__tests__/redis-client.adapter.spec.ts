import { vi, describe, expect, it } from 'vitest';
import Redis from 'ioredis';

import { RedisClientAdapter, RedisSubscriberAdapter } from '../redis-client.adapter';

describe('RedisClientAdapter', () => {
  it('delegates lifecycle, keys, writes, deletion and evaluation exactly', async () => {
    const client = new Redis({ lazyConnect: true });
    const ping = vi.spyOn(client, 'ping').mockResolvedValue('PONG');
    const get = vi.spyOn(client, 'get').mockResolvedValue('value');
    const set = vi.spyOn(client, 'set').mockResolvedValue('OK');
    const del = vi.spyOn(client, 'del').mockResolvedValue(2);
    const evaluate = vi.spyOn(client, 'eval').mockResolvedValue(['OK', 'ack']);
    const disconnect = vi.spyOn(client, 'disconnect').mockImplementation(() => {});
    const quit = vi.spyOn(client, 'quit').mockResolvedValue('OK');
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
    vi.spyOn(client, 'eval').mockImplementation(() => new Promise(() => {}));
    const disconnect = vi.spyOn(client, 'disconnect').mockImplementation(() => {});
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.evalRuntimeV2('script', 1, ['key'], 20)).rejects.toThrow(
      'Runtime V2 Redis deadline exceeded',
    );
    expect(disconnect).toHaveBeenCalledWith(true);
  });

  it('caps an oversized Runtime V2 deadline before scheduling its timer', async () => {
    vi.useFakeTimers();
    const schedule = vi.spyOn(globalThis, 'setTimeout');
    const client = new Redis({ lazyConnect: true });
    vi.spyOn(client, 'eval').mockResolvedValue('OK');
    const adapter = new RedisClientAdapter(client);

    await expect(
      adapter.evalRuntimeV2('script', 1, ['key'], Number.MAX_SAFE_INTEGER),
    ).resolves.toBe('OK');
    expect(schedule).toHaveBeenLastCalledWith(expect.any(Function), 10_000);

    schedule.mockRestore();
    vi.useRealTimers();
  });

  it.each([Number.NaN, -1])('uses the hard cap for an invalid deadline %p', async (deadlineMs) => {
    vi.useFakeTimers();
    const schedule = vi.spyOn(globalThis, 'setTimeout');
    const client = new Redis({ lazyConnect: true });
    vi.spyOn(client, 'eval').mockResolvedValue('OK');
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.evalRuntimeV2('script', 1, ['key'], deadlineMs)).resolves.toBe('OK');
    expect(schedule).toHaveBeenLastCalledWith(expect.any(Function), 10_000);

    schedule.mockRestore();
    vi.useRealTimers();
  });

  it('disconnects and preserves Runtime V2 Redis errors', async () => {
    const client = new Redis({ lazyConnect: true });
    const failure = new Error('redis unavailable');
    vi.spyOn(client, 'eval').mockRejectedValue(failure);
    const disconnect = vi.spyOn(client, 'disconnect').mockImplementation(() => {});
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.evalRuntimeV2('script', 1, ['key'], 100)).rejects.toBe(failure);
    expect(disconnect).toHaveBeenCalledWith(true);
  });

  it('normalizes non-Error Runtime V2 Redis rejections', async () => {
    const client = new Redis({ lazyConnect: true });
    vi.spyOn(client, 'eval').mockRejectedValue('offline');
    vi.spyOn(client, 'disconnect').mockImplementation(() => {});
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.evalRuntimeV2('script', 1, ['key'], 100)).rejects.toThrow(
      'Runtime V2 Redis command failed',
    );
  });

  it('ignores a late Redis resolution after the deadline', async () => {
    vi.useFakeTimers();
    const client = new Redis({ lazyConnect: true });
    let resolveEvaluation: (value: unknown) => void = () => {};
    vi.spyOn(client, 'eval').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveEvaluation = resolve;
        }),
    );
    vi.spyOn(client, 'disconnect').mockImplementation(() => {});
    const adapter = new RedisClientAdapter(client);
    const result = adapter.evalRuntimeV2('script', 1, ['key'], 10);
    const rejection = expect(result).rejects.toThrow('Runtime V2 Redis deadline exceeded');

    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    resolveEvaluation('late');
    await Promise.resolve();
    vi.useRealTimers();
  });

  it('ignores a late Redis rejection after the deadline', async () => {
    vi.useFakeTimers();
    const client = new Redis({ lazyConnect: true });
    let rejectEvaluation: (reason: unknown) => void = () => {};
    vi.spyOn(client, 'eval').mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectEvaluation = reject;
        }),
    );
    vi.spyOn(client, 'disconnect').mockImplementation(() => {});
    const adapter = new RedisClientAdapter(client);
    const result = adapter.evalRuntimeV2('script', 1, ['key'], 10);
    const rejection = expect(result).rejects.toThrow('Runtime V2 Redis deadline exceeded');

    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    rejectEvaluation(new Error('late'));
    await Promise.resolve();
    vi.useRealTimers();
  });

  it('makes a settled deadline callback a no-op', async () => {
    vi.useFakeTimers();
    const clearTimer = vi.spyOn(globalThis, 'clearTimeout').mockImplementation(() => {});
    const client = new Redis({ lazyConnect: true });
    vi.spyOn(client, 'eval').mockResolvedValue('OK');
    const disconnect = vi.spyOn(client, 'disconnect').mockImplementation(() => {});
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.evalRuntimeV2('script', 1, ['key'], 10)).resolves.toBe('OK');
    await vi.advanceTimersByTimeAsync(10);
    expect(disconnect).not.toHaveBeenCalled();
    clearTimer.mockRestore();
    vi.useRealTimers();
  });

  it('uses a plain write when the expiration arguments are incomplete', async () => {
    const client = new Redis({ lazyConnect: true });
    const set = vi.spyOn(client, 'set').mockResolvedValue('OK');
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.set('key', 'value', 'EX')).resolves.toBe('OK');
    expect(set.mock.calls[0]).toEqual(['key', 'value']);
  });

  it('reads a whole list for the chat replay buffer', async () => {
    const client = new Redis({ lazyConnect: true });
    const lrange = vi.spyOn(client, 'lrange').mockResolvedValue(['a', 'b']);
    const adapter = new RedisClientAdapter(client);

    await expect(adapter.lrange('key', 0, -1)).resolves.toEqual(['a', 'b']);
    expect(lrange).toHaveBeenCalledWith('key', 0, -1);
  });
});

describe('RedisSubscriberAdapter', () => {
  it('subscribes to a channel', async () => {
    const client = new Redis({ lazyConnect: true });
    const subscribe = vi.spyOn(client, 'subscribe').mockResolvedValue(1);
    const adapter = new RedisSubscriberAdapter(client);

    await adapter.subscribe('claw:chat:stream');

    expect(subscribe).toHaveBeenCalledWith('claw:chat:stream');
  });

  it('forwards published messages to the handler', () => {
    const client = new Redis({ lazyConnect: true });
    const adapter = new RedisSubscriberAdapter(client);
    const received: Array<[string, string]> = [];

    adapter.onMessage((channel, payload) => received.push([channel, payload]));
    client.emit('message', 'claw:chat:stream', '{"threadId":"t"}');

    expect(received).toEqual([['claw:chat:stream', '{"threadId":"t"}']]);
  });

  it('reports every reconnection so subscriptions can be re-asserted', () => {
    // ioredis restores the connection but not the subscription. A replica that
    // is connected-but-unsubscribed keeps its SSE clients open and silent,
    // which reads exactly like a model that stopped responding.
    const client = new Redis({ lazyConnect: true });
    const adapter = new RedisSubscriberAdapter(client);
    let readies = 0;

    adapter.onReady(() => {
      readies += 1;
    });
    client.emit('ready');
    client.emit('ready');

    expect(readies).toBe(2);
  });

  it('closes its connection on quit', async () => {
    const client = new Redis({ lazyConnect: true });
    const quit = vi.spyOn(client, 'quit').mockResolvedValue('OK');
    const adapter = new RedisSubscriberAdapter(client);

    await expect(adapter.quit()).resolves.toBe('OK');
    expect(quit).toHaveBeenCalledTimes(1);
  });
});
