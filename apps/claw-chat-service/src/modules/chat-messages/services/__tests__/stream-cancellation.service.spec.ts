import { STREAM_CANCEL_CHANNEL } from '../../constants/stream-cancellation.constants';
import { StreamCancellationService } from '../stream-cancellation.service';

type MessageHandler = (channel: string, payload: string) => void;

function build(
  overrides: { delResult?: number; delRejects?: boolean; evalRejects?: boolean } = {},
) {
  let messageHandler: MessageHandler | null = null;
  const redis = {
    del: jest.fn(() =>
      overrides.delRejects === true
        ? Promise.reject(new Error('redis down'))
        : Promise.resolve(overrides.delResult ?? 1),
    ),
    set: jest.fn(() => Promise.resolve('OK')),
    eval: jest.fn(() =>
      overrides.evalRejects === true ? Promise.reject(new Error('redis down')) : Promise.resolve(1),
    ),
  };
  const subscriber = {
    subscribe: jest.fn(() => Promise.resolve()),
    onMessage: jest.fn((handler: MessageHandler) => {
      messageHandler = handler;
    }),
    onReady: jest.fn(),
  };
  const service = new StreamCancellationService(redis as never, subscriber as never);
  return {
    service,
    redis,
    broadcast: (key: string) => messageHandler?.(STREAM_CANCEL_CHANNEL, key),
  };
}

describe('StreamCancellationService', () => {
  it('aborts a run held by THIS replica when another replica broadcasts the stop', async () => {
    // The whole point: the Stop request lands on whichever replica nginx picked,
    // which is usually not the one holding the provider connection.
    const { service, broadcast } = build();
    await service.onModuleInit();
    const controller = service.register('thread-1');

    broadcast('thread-1');

    expect(controller.signal.aborted).toBe(true);
    expect(service.isActive('thread-1')).toBe(false);
  });

  it('ignores a broadcast for a run it is not holding', async () => {
    const { service, broadcast } = build();
    await service.onModuleInit();
    const controller = service.register('thread-1');

    expect(() => broadcast('thread-other')).not.toThrow();

    expect(controller.signal.aborted).toBe(false);
  });

  it('reports whether anything was running from Redis, not from its own map', async () => {
    // This replica holds nothing, and must still answer truthfully that a run
    // on some other replica was stopped.
    const { service } = build({ delResult: 1 });

    await expect(service.cancel('thread-elsewhere')).resolves.toBe(true);
  });

  it('reports false when there was nothing to stop', async () => {
    const { service } = build({ delResult: 0 });

    await expect(service.cancel('thread-idle')).resolves.toBe(false);
  });

  it('broadcasts even when the run marker had already expired', async () => {
    // A long run whose marker aged out is still worth aborting if a replica is
    // holding it; refusing to broadcast would leave the model generating.
    const { service, redis } = build({ delResult: 0 });

    await service.cancel('thread-stale');

    expect(redis.eval).toHaveBeenCalledTimes(1);
  });

  it('still aborts locally when Redis cannot broadcast', async () => {
    // A single-replica install must keep working with Redis unreachable.
    const { service } = build({ evalRejects: true });
    await service.onModuleInit();
    const controller = service.register('thread-1');

    await service.cancel('thread-1');

    expect(controller.signal.aborted).toBe(true);
  });

  it('falls back to local knowledge when the run marker cannot be read', async () => {
    const { service } = build({ delRejects: true, evalRejects: true });
    await service.onModuleInit();
    service.register('thread-1');

    await expect(service.cancel('thread-1')).resolves.toBe(true);
  });

  it('aborts a previous controller when the same key is registered twice', () => {
    // A retry that re-registers must not leave the first provider connection
    // running and billing.
    const { service } = build();
    const first = service.register('thread-1');

    service.register('thread-1');

    expect(first.signal.aborted).toBe(true);
  });

  it('clears the shared run marker on release', () => {
    // Otherwise a finished run keeps answering "yes, something is running" until
    // the TTL expires.
    const { service, redis } = build();
    service.register('thread-1');
    redis.del.mockClear();

    service.release('thread-1');

    expect(redis.del).toHaveBeenCalledTimes(1);
  });
});
