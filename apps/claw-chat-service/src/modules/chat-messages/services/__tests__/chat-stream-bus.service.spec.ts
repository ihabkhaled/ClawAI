import { CHAT_STREAM_CHANNEL } from '../../constants/chat-stream-bus.constants';
import { ChatStreamBusService } from '../chat-stream-bus.service';
import type { StreamEvent } from '../../types/stream.types';

type MessageHandler = (channel: string, payload: string) => void;

function build(overrides: { evalRejects?: boolean; lrangeRejects?: boolean } = {}) {
  let messageHandler: MessageHandler | null = null;
  let readyHandler: (() => void) | null = null;

  const redis = {
    eval: jest.fn(() =>
      overrides.evalRejects === true ? Promise.reject(new Error('redis down')) : Promise.resolve(1),
    ),
    lrange: jest.fn((): Promise<string[]> =>
      overrides.lrangeRejects === true
        ? Promise.reject(new Error('redis down'))
        : Promise.resolve<string[]>([]),
    ),
    del: jest.fn(() => Promise.resolve(1)),
  };
  const subscriber = {
    subscribe: jest.fn(() => Promise.resolve()),
    onMessage: jest.fn((handler: MessageHandler) => {
      messageHandler = handler;
    }),
    onReady: jest.fn((handler: () => void) => {
      readyHandler = handler;
    }),
  };

  const service = new ChatStreamBusService(redis as never, subscriber as never);
  return {
    service,
    redis,
    subscriber,
    emitMessage: (channel: string, payload: string) => messageHandler?.(channel, payload),
    fireReady: () => readyHandler?.(),
  };
}

const frame: StreamEvent = { threadId: 'thread-1', type: 'content_delta' } as StreamEvent;

describe('ChatStreamBusService', () => {
  it('refuses a frame whose threadId could break the JSON the Lua script builds', () => {
    // The id is concatenated into a JSON string inside Lua. A quote would
    // produce a frame every client on the thread fails to parse, so it is
    // rejected here rather than escaped downstream.
    const { service, redis } = build();

    service.publish({ ...frame, threadId: 'evil","x":"' });

    expect(redis.eval).not.toHaveBeenCalled();
  });

  it('delivers locally when the Redis fan-out fails, instead of going silent', async () => {
    // A single-replica install must degrade to exactly its old behaviour. Other
    // replicas miss the frame, but the answer is still written to the database
    // and the client's poll finds it.
    const { service } = build({ evalRejects: true });
    const received: StreamEvent[] = [];
    service.onEvent((event) => received.push(event));

    service.publish(frame);
    await new Promise((resolve) => setImmediate(resolve));

    expect(received).toHaveLength(1);
    expect(received[0]?.threadId).toBe('thread-1');
  });

  it('does not deliver a frame published on a different channel', async () => {
    const { service, emitMessage } = build();
    const received: StreamEvent[] = [];
    service.onEvent((event) => received.push(event));
    await service.onModuleInit();

    emitMessage('some:other:channel', JSON.stringify(frame));

    expect(received).toHaveLength(0);
  });

  it('drops an unparsable frame without tearing down the subscription', async () => {
    // An exception escaping the subscriber callback would end the subscription
    // for the whole replica, leaving every SSE connection it serves open and
    // permanently silent.
    const { service, emitMessage } = build();
    const received: StreamEvent[] = [];
    service.onEvent((event) => received.push(event));
    await service.onModuleInit();

    expect(() => emitMessage(CHAT_STREAM_CHANNEL, 'not json')).not.toThrow();
    emitMessage(CHAT_STREAM_CHANNEL, JSON.stringify(frame));

    expect(received).toHaveLength(1);
  });

  it('re-subscribes when the connection comes back', async () => {
    // ioredis restores the connection silently but not the subscription. A
    // replica that is connected-but-unsubscribed looks exactly like a model
    // that stopped responding.
    const { service, subscriber, fireReady } = build();
    await service.onModuleInit();
    expect(subscriber.subscribe).toHaveBeenCalledTimes(1);

    fireReady();
    await new Promise((resolve) => setImmediate(resolve));

    expect(subscriber.subscribe).toHaveBeenCalledTimes(2);
  });

  it('returns an empty replay rather than refusing to open the stream', async () => {
    // A replay is a convenience. Throwing here would turn a degraded reconnect
    // into no reconnect at all.
    const { service } = build({ lrangeRejects: true });

    await expect(service.replay('thread-1')).resolves.toEqual([]);
  });

  it('skips unparsable entries in the replay buffer', async () => {
    const { service, redis } = build();
    redis.lrange.mockResolvedValueOnce([JSON.stringify(frame), 'corrupt', JSON.stringify(frame)]);

    await expect(service.replay('thread-1')).resolves.toHaveLength(2);
  });

  describe('resuming after a known sequence (D4)', () => {
    // Nest auto-assigned a wire id from a per-connection counter, unrelated to
    // this application's own `eventId`, so a reconnect could never say "I
    // already have up to N" — every reconnect replayed the whole buffer. This
    // is the half that makes the wire id worth having: the ability to use it.
    function frameAt(sequence: number): StreamEvent {
      return { ...frame, sequence } as StreamEvent;
    }

    it('returns only frames after the given sequence', async () => {
      const { service, redis } = build();
      redis.lrange.mockResolvedValueOnce([1, 2, 3, 4, 5].map((n) => JSON.stringify(frameAt(n))));

      const result = await service.replay('thread-1', 3);

      expect(result.map((f) => f.sequence)).toEqual([4, 5]);
    });

    it('returns the whole buffer when no sequence is given, unchanged', async () => {
      const { service, redis } = build();
      redis.lrange.mockResolvedValueOnce([1, 2, 3].map((n) => JSON.stringify(frameAt(n))));

      const result = await service.replay('thread-1');

      expect(result.map((f) => f.sequence)).toEqual([1, 2, 3]);
    });

    it('returns nothing when the client is already caught up', async () => {
      const { service, redis } = build();
      redis.lrange.mockResolvedValueOnce([1, 2, 3].map((n) => JSON.stringify(frameAt(n))));

      const result = await service.replay('thread-1', 3);

      expect(result).toEqual([]);
    });

    it('returns the whole buffer when the requested sequence has already rolled off it', async () => {
      // The buffer is capped at CHAT_STREAM_REPLAY_LIMIT; a client that has
      // been offline long enough to fall behind the whole window gets
      // everything that is left, which is the correct degraded behaviour
      // rather than an empty answer.
      const { service, redis } = build();
      redis.lrange.mockResolvedValueOnce([50, 51, 52].map((n) => JSON.stringify(frameAt(n))));

      const result = await service.replay('thread-1', 10);

      expect(result.map((f) => f.sequence)).toEqual([50, 51, 52]);
    });

    it('treats a frame with no sequence field as sequence 0', async () => {
      // `frame` carries no `sequence`. Coercing the missing value to 0 (rather
      // than, say, Infinity or throwing) is what makes "after 0" correctly
      // exclude it and "no afterSequence at all" correctly include it.
      const { service, redis } = build();
      redis.lrange.mockResolvedValueOnce([JSON.stringify(frame)]);
      const afterZero = await service.replay('thread-1', 0);
      expect(afterZero).toEqual([]);

      redis.lrange.mockResolvedValueOnce([JSON.stringify(frame)]);
      const wholeBuffer = await service.replay('thread-1');
      expect(wholeBuffer).toHaveLength(1);
    });
  });

  it('clears the replay buffer without touching the sequence counter', async () => {
    // Resetting the sequence would restart numbering at 1, and the browser
    // discards a progress stage whose sequence is below one already rendered.
    const { service, redis } = build();

    await service.resetReplay('thread-1');

    expect(redis.del).toHaveBeenCalledTimes(1);
    expect(redis.del).toHaveBeenCalledWith(expect.stringContaining('replay'));
    expect(redis.del).not.toHaveBeenCalledWith(expect.stringContaining('seq'));
  });
});
