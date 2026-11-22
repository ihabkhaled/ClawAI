import { EventEmitter } from 'node:events';

import { LiveStreamEventType } from '../../../../common/enums/live-stream-event-type.enum';
import { RedisLiveEventBus } from '../redis-live-event-bus.service';

function setup() {
  const subscriber = Object.assign(new EventEmitter(), {
    subscribe: vi.fn().mockResolvedValue(1),
    unsubscribe: vi.fn().mockResolvedValue(1),
    disconnect: vi.fn(),
  });
  const redis = {
    eval: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(2),
    duplicate: vi.fn(() => subscriber),
  };
  return { bus: new RedisLiveEventBus(redis as never), redis, subscriber };
}

const event = {
  type: LiveStreamEventType.CAPTION,
  runId: 'run1',
  startAt: 1,
  data: { text: 'hi' },
};

describe('RedisLiveEventBus', () => {
  it('publishes through the Lua script with per-run keys, channel, limit 500 and 6 h TTL', async () => {
    const { bus, redis } = setup();
    await bus.publish(event);
    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('INCR', KEYS[1])"),
      2,
      'claw:live:seq:run1',
      'claw:live:replay:run1',
      'claw:live:run:run1',
      JSON.stringify(event),
      'run1',
      500,
      21_600,
    );
  });

  it('drops (and warns about) an event over 8 KB', async () => {
    const { bus, redis } = setup();
    await bus.publish({ ...event, data: { text: 'x'.repeat(9000) } });
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it('drops an event with an unsafe run id', async () => {
    const { bus, redis } = setup();
    await bus.publish({ ...event, runId: 'run"1' });
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it('never fails the caller when Redis is down', async () => {
    const { bus, redis } = setup();
    redis.eval.mockRejectedValue(new Error('down'));
    await expect(bus.publish(event)).resolves.toBeUndefined();
  });

  it('replays buffered frames after a sequence, skipping malformed ones', async () => {
    const { bus, redis } = setup();
    redis.lrange.mockResolvedValue([
      JSON.stringify({ ...event, id: 'run1:1', seq: 1 }),
      'not json',
      JSON.stringify({ ...event, id: 'run1:2', seq: 2 }),
    ]);
    const frames = await bus.replay('run1', 1);
    expect(frames.map((f) => f.seq)).toEqual([2]);
  });

  it('shares one subscriber connection and fans frames out to the run listeners', async () => {
    const { bus, redis, subscriber } = setup();
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = await bus.subscribe('run1', first);
    await bus.subscribe('run1', second);
    await bus.subscribe('run2', vi.fn());
    expect(redis.duplicate).toHaveBeenCalledTimes(1);
    expect(subscriber.subscribe).toHaveBeenCalledTimes(2);

    subscriber.emit(
      'message',
      'claw:live:run:run1',
      JSON.stringify({ ...event, id: 'run1:3', seq: 3 }),
    );
    expect(first).toHaveBeenCalledWith(expect.objectContaining({ seq: 3 }));
    expect(second).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    subscriber.emit(
      'message',
      'claw:live:run:run1',
      JSON.stringify({ ...event, id: 'run1:4', seq: 4 }),
    );
    expect(first).toHaveBeenCalledTimes(1);
    expect(subscriber.unsubscribe).not.toHaveBeenCalled();
  });

  it('unsubscribes the channel when its last listener leaves, and isolates a throwing listener', async () => {
    const { bus, subscriber } = setup();
    const ok = vi.fn();
    await bus.subscribe('run1', () => {
      throw new Error('boom');
    });
    const unsubscribe = await bus.subscribe('run1', ok);
    subscriber.emit(
      'message',
      'claw:live:run:run1',
      JSON.stringify({ ...event, id: 'run1:1', seq: 1 }),
    );
    expect(ok).toHaveBeenCalled();
    unsubscribe();
    bus.onModuleDestroy();
    expect(subscriber.disconnect).toHaveBeenCalled();
  });

  it('clears a run replay buffer', async () => {
    const { bus, redis } = setup();
    await bus.clearReplay('run1');
    expect(redis.del).toHaveBeenCalledWith('claw:live:replay:run1', 'claw:live:seq:run1');
  });
});
