import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import amqplib from 'amqplib';
import { EXCHANGE_NAME, RABBITMQ_QUEUE_PREFIX } from '@claw/shared-constants';
import { type EventPattern } from '@claw/shared-types';
import { RABBITMQ_MODULE_OPTIONS, type RabbitMQModuleOptions, type PendingSubscription } from './rabbitmq.types';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const MESSAGE_TTL_MS = 86_400_000; // 24 hours

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly exchangeName: string;
  private readonly queuePrefix: string;
  private readonly pendingSubscriptions: PendingSubscription[] = [];

  constructor(
    @Inject(RABBITMQ_MODULE_OPTIONS)
    private readonly options: RabbitMQModuleOptions,
  ) {
    this.exchangeName = options.exchangeName ?? EXCHANGE_NAME;
    this.queuePrefix = options.queuePrefix ?? RABBITMQ_QUEUE_PREFIX;
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqplib.connect(this.options.url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      this.logger.log(`Connected to RabbitMQ, exchange: ${this.exchangeName}`);

      await this.replayPendingSubscriptions();

      this.connection.on('error', (err: Error) => {
        this.logger.error('RabbitMQ connection error', err);
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed, attempting reconnect...');
        this.channel = null;
        setTimeout(() => {
          void this.connect();
        }, 5000);
      });
    } catch (err) {
      this.logger.error('Failed to connect to RabbitMQ', err);
      setTimeout(() => {
        void this.connect();
      }, 5000);
    }
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch (err) {
      this.logger.error('Error disconnecting from RabbitMQ', err);
    }
  }

  async publish(pattern: EventPattern | string, payload: unknown): Promise<void> {
    if (!this.channel) {
      this.logger.error('Cannot publish: channel not available');
      return;
    }

    const message = Buffer.from(
      JSON.stringify({
        pattern,
        data: payload,
        timestamp: new Date().toISOString(),
        source: this.options.serviceName,
      }),
    );

    this.channel.publish(this.exchangeName, pattern, message, {
      persistent: true,
      contentType: 'application/json',
      expiration: String(MESSAGE_TTL_MS),
    });

    this.logger.debug(`Published event: ${pattern}`);
  }

  async subscribe(
    pattern: EventPattern | string,
    handler: (data: unknown) => Promise<void>,
  ): Promise<void> {
    this.storePendingSubscription(pattern, handler);

    if (!this.channel) {
      this.logger.warn(
        `Channel not available, subscription to ${pattern} will be established on connect`,
      );
      return;
    }

    await this.subscribeInternal(pattern, handler);
  }

  private getRetryCount(msg: amqplib.ConsumeMessage): number {
    const headers = msg.properties.headers as Record<string, unknown> | undefined;
    return typeof headers?.['x-retry-count'] === 'number' ? headers['x-retry-count'] : 0;
  }

  private republishWithRetry(pattern: string, content: Buffer, retryCount: number): void {
    if (!this.channel) return;

    this.channel.publish(this.exchangeName, pattern, content, {
      persistent: true,
      contentType: 'application/json',
      headers: { 'x-retry-count': retryCount },
      expiration: String(MESSAGE_TTL_MS),
    });
  }

  private storePendingSubscription(
    pattern: EventPattern | string,
    handler: (data: unknown) => Promise<void>,
  ): void {
    const alreadyPending = this.pendingSubscriptions.some((s) => s.pattern === pattern);
    if (!alreadyPending) {
      this.pendingSubscriptions.push({ pattern, handler });
    }
  }

  private async replayPendingSubscriptions(): Promise<void> {
    if (this.pendingSubscriptions.length === 0) {
      return;
    }

    this.logger.log(
      `Replaying ${String(this.pendingSubscriptions.length)} pending subscription(s)...`,
    );

    for (const sub of this.pendingSubscriptions) {
      await this.subscribeInternal(sub.pattern, sub.handler);
    }
  }

  private async subscribeInternal(
    pattern: string,
    handler: (data: unknown) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) {
      return;
    }

    const queueName = `${this.queuePrefix}.${this.options.serviceName}.${pattern}`;
    const dlqName = `${queueName}.dlq`;

    await this.channel.assertQueue(dlqName, {
      durable: true,
      arguments: { 'x-message-ttl': MESSAGE_TTL_MS },
    });

    await this.channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': dlqName,
      },
    });
    await this.channel.bindQueue(queueName, this.exchangeName, pattern);

    await this.channel.consume(queueName, async (msg) => {
      if (!msg) {
        return;
      }

      const retryCount = this.getRetryCount(msg);

      try {
        const content = JSON.parse(msg.content.toString()) as Record<string, unknown>;
        await handler(content['data'] ?? content);
        this.channel?.ack(msg);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';

        if (retryCount < MAX_RETRIES) {
          this.logger.warn(
            `Retry ${String(retryCount + 1)}/${String(MAX_RETRIES)} for ${pattern}: ${errMsg}`,
          );
          this.channel?.ack(msg);
          setTimeout(() => {
            this.republishWithRetry(pattern, msg.content, retryCount + 1);
          }, RETRY_DELAY_MS * (retryCount + 1));
        } else {
          this.logger.error(
            `Message exhausted ${String(MAX_RETRIES)} retries on ${pattern}, sending to DLQ: ${errMsg}`,
          );
          this.channel?.nack(msg, false, false);
        }
      }
    });

    this.logger.log(`Subscribed to: ${pattern} on queue: ${queueName} (DLQ: ${dlqName})`);
  }
}
