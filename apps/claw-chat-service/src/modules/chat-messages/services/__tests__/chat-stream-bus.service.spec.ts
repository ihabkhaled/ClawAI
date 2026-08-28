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
