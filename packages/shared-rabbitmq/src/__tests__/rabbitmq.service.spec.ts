import { Logger } from '@nestjs/common';
import amqplib from 'amqplib';
import { EXCHANGE_NAME, RABBITMQ_QUEUE_PREFIX } from '@claw/shared-constants';

import { RabbitMQService } from '../rabbitmq.service';

vi.mock('amqplib', () => ({ default: { connect: vi.fn() } }));

function createChannel() {
  return {
    assertExchange: vi.fn().mockResolvedValue(undefined),
    prefetch: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockReturnValue(true),
    assertQueue: vi.fn().mockResolvedValue(undefined),
    bindQueue: vi.fn().mockResolvedValue(undefined),
    consume: vi.fn().mockResolvedValue(undefined),
    ack: vi.fn(),
    nack: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    once: vi.fn(),
    waitForConfirms: vi.fn().mockResolvedValue(undefined),
  };
}

function createConnection(
  channel: ReturnType<typeof createChannel>,
  confirm: ReturnType<typeof createChannel>,
) {
  const listeners = new Map<string, (arg?: unknown) => void>();
  return {
    listeners,
    createChannel: vi.fn().mockResolvedValue(channel),
    createConfirmChannel: vi.fn().mockResolvedValue(confirm),
    on: vi.fn((event: string, listener: (arg?: unknown) => void) => {
      listeners.set(event, listener);
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function consumedMessage(data: unknown, retryCount?: number) {
  return {
    content: Buffer.from(JSON.stringify({ pattern: 'thing.happened', data })),
    properties: { headers: retryCount === undefined ? {} : { 'x-retry-count': retryCount } },
  };
}

describe('RabbitMQService', () => {
  let channel: ReturnType<typeof createChannel>;
  let confirm: ReturnType<typeof createChannel>;
  let connection: ReturnType<typeof createConnection>;
  const connect = vi.mocked(amqplib.connect);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    channel = createChannel();
    confirm = createChannel();
    connection = createConnection(channel, confirm);
    connect.mockReset();
    connect.mockResolvedValue(connection as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function connectedService(
    options: Partial<{ prefetchCount: number; exchangeName: string; queuePrefix: string }> = {},
  ) {
    const service = new RabbitMQService({ url: 'amqp://broker', serviceName: 'chat', ...options });
    await service.onModuleInit();
    return service;
  }

  it('declares the topic exchange on both channels and applies the default prefetch', async () => {
    await connectedService();

    expect(connect).toHaveBeenCalledWith('amqp://broker');
    expect(channel.assertExchange).toHaveBeenCalledWith(EXCHANGE_NAME, 'topic', { durable: true });
    expect(confirm.assertExchange).toHaveBeenCalledWith(EXCHANGE_NAME, 'topic', { durable: true });
    expect(channel.prefetch).toHaveBeenCalledWith(50);
  });

  it('honours a custom exchange, queue prefix and prefetch', async () => {
    const service = await connectedService({
      exchangeName: 'custom.x',
      queuePrefix: 'q',
      prefetchCount: 7,
    });
    await service.subscribe('thing.happened', vi.fn());

    expect(channel.prefetch).toHaveBeenCalledWith(7);
    expect(channel.bindQueue).toHaveBeenCalledWith(
      'q.chat.thing.happened',
      'custom.x',
      'thing.happened',
    );
  });

  it('publishes a persistent JSON envelope stamped with the source service', async () => {
    const service = await connectedService();
    await service.publish('thing.happened', { id: 1 });

    const [exchange, pattern, body, options] = channel.publish.mock.calls[0] as [
      string,
      string,
      Buffer,
      Record<string, unknown>,
    ];
    expect(exchange).toBe(EXCHANGE_NAME);
    expect(pattern).toBe('thing.happened');
    expect(JSON.parse(body.toString())).toMatchObject({
      pattern: 'thing.happened',
      data: { id: 1 },
      source: 'chat',
    });
    expect(options).toMatchObject({
      persistent: true,
      contentType: 'application/json',
      expiration: '86400000',
    });
  });

  it('drops a publish with an error log when no channel is open', async () => {
    const service = new RabbitMQService({ url: 'amqp://broker', serviceName: 'chat' });
    await service.publish('thing.happened', {});

    expect(channel.publish).not.toHaveBeenCalled();
    expect(Logger.prototype.error).toHaveBeenCalledWith('Cannot publish: channel not available');
  });

  it('refuses a confirmed publish without a confirm channel', async () => {
    const service = new RabbitMQService({ url: 'amqp://broker', serviceName: 'chat' });

    await expect(service.publishConfirmed('thing.happened', {})).rejects.toThrow(
      'RabbitMQ confirmed publisher is unavailable',
    );
  });

  it('waits for broker confirmation, and for drain when the buffer is full', async () => {
    const service = await connectedService();
    await service.publishConfirmed('thing.happened', { id: 1 });
    expect(confirm.waitForConfirms).toHaveBeenCalledTimes(1);
    expect(confirm.once).not.toHaveBeenCalled();

    confirm.publish.mockReturnValueOnce(false);
    confirm.once.mockImplementation((_event: string, resolve: () => void) => resolve());
    await service.publishConfirmed('thing.happened', { id: 2 });
    expect(confirm.once).toHaveBeenCalledWith('drain', expect.any(Function));
    expect(confirm.waitForConfirms).toHaveBeenCalledTimes(2);
  });

  it('binds a durable queue with a dead-letter queue per subscription', async () => {
    const service = await connectedService();
    await service.subscribe('thing.happened', vi.fn());

    const queue = `${RABBITMQ_QUEUE_PREFIX}.chat.thing.happened`;
    expect(channel.assertQueue).toHaveBeenCalledWith(`${queue}.dlq`, {
      durable: true,
      arguments: { 'x-message-ttl': 86_400_000 },
    });
    expect(channel.assertQueue).toHaveBeenCalledWith(queue, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `${queue}.dlq` },
    });
    expect(channel.bindQueue).toHaveBeenCalledWith(queue, EXCHANGE_NAME, 'thing.happened');
  });

  it('remembers subscriptions made before connecting and replays each once', async () => {
    const service = new RabbitMQService({ url: 'amqp://broker', serviceName: 'chat' });
    await service.subscribe('thing.happened', vi.fn());
    await service.subscribe('thing.happened', vi.fn());
    expect(channel.consume).not.toHaveBeenCalled();

    await service.onModuleInit();
    expect(channel.consume).toHaveBeenCalledTimes(1);
  });

  async function consumer(handler: (data: unknown) => Promise<void>) {
    const service = await connectedService();
    await service.subscribe('thing.happened', handler);
    const onMessage = channel.consume.mock.calls[0]?.[1] as (msg: unknown) => void;
    return onMessage;
  }

  it('hands the event data to the handler and acks it', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const onMessage = await consumer(handler);
    const msg = consumedMessage({ id: 1 });

    onMessage(msg);
    await vi.runAllTimersAsync();

    expect(handler).toHaveBeenCalledWith({ id: 1 });
    expect(channel.ack).toHaveBeenCalledWith(msg);
  });

  it('ignores the null message the broker sends on consumer cancellation', async () => {
    const handler = vi.fn();
    const onMessage = await consumer(handler);

    onMessage(null);
    await vi.runAllTimersAsync();

    expect(handler).not.toHaveBeenCalled();
  });

  it('acks a failed message and republishes it later with the retry count raised', async () => {
    const onMessage = await consumer(vi.fn().mockRejectedValue(new Error('boom')));
    const msg = consumedMessage({ id: 1 }, 1);

    onMessage(msg);
    await vi.advanceTimersByTimeAsync(0);
    expect(channel.ack).toHaveBeenCalledWith(msg);
    expect(channel.publish).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(channel.publish).toHaveBeenCalledWith(EXCHANGE_NAME, 'thing.happened', msg.content, {
      persistent: true,
      contentType: 'application/json',
      headers: { 'x-retry-count': 2 },
      expiration: '86400000',
    });
  });

  it('dead-letters a message that exhausted its retries', async () => {
    const onMessage = await consumer(vi.fn().mockRejectedValue('not an error'));
    const msg = consumedMessage({ id: 1 }, 3);

    onMessage(msg);
    await vi.runAllTimersAsync();

    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    expect(channel.ack).not.toHaveBeenCalled();
  });

  it('reconnects after the connection closes and after a failed connect', async () => {
    await connectedService();
    connection.listeners.get('error')?.(new Error('socket'));
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'RabbitMQ connection error',
      expect.any(Error),
    );

    connect.mockRejectedValueOnce(new Error('refused'));
    connection.listeners.get('close')?.();
    await vi.advanceTimersByTimeAsync(5000);
    expect(connect).toHaveBeenCalledTimes(2);
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Failed to connect to RabbitMQ',
      expect.any(Error),
    );

    await vi.advanceTimersByTimeAsync(5000);
    expect(connect).toHaveBeenCalledTimes(3);
  });

  it('closes both channels and the connection on shutdown, logging a failed close', async () => {
    const service = await connectedService();
    await service.onModuleDestroy();

    expect(channel.close).toHaveBeenCalledTimes(1);
    expect(confirm.close).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);

    const failing = await connectedService();
    channel.close.mockRejectedValueOnce(new Error('already closed'));
    await failing.onModuleDestroy();
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Error disconnecting from RabbitMQ',
      expect.any(Error),
    );
  });

  it('does nothing on shutdown when it never connected', async () => {
    const service = new RabbitMQService({ url: 'amqp://broker', serviceName: 'chat' });
    await service.onModuleDestroy();

    expect(channel.close).not.toHaveBeenCalled();
  });
});
