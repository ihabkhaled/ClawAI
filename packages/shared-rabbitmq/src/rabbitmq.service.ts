import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { EXCHANGE_NAME, RABBITMQ_QUEUE_PREFIX } from '@claw/shared-constants';
import { type EventPattern } from '@claw/shared-types';
import { RABBITMQ_MODULE_OPTIONS, type RabbitMQModuleOptions } from './rabbitmq.types';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqplib.Connection | null = null;
  private channel: amqplib.Channel | null = null;
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly exchangeName: string;
  private readonly queuePrefix: string;

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

      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error', err);
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed, attempting reconnect...');
        setTimeout(() => this.connect(), 5000);
      });
    } catch (err) {
      this.logger.error('Failed to connect to RabbitMQ', err);
      setTimeout(() => this.connect(), 5000);
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
    });

    this.logger.debug(`Published event: ${pattern}`);
  }

  async subscribe(
    pattern: EventPattern | string,
    handler: (data: unknown) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) {
      this.logger.error('Cannot subscribe: channel not available');
      return;
    }

    const queueName = `${this.queuePrefix}.${this.options.serviceName}.${pattern}`;

    await this.channel.assertQueue(queueName, { durable: true });
    await this.channel.bindQueue(queueName, this.exchangeName, pattern);

    await this.channel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        await handler(content.data ?? content);
        this.channel?.ack(msg);
      } catch (err) {
        this.logger.error(`Error processing message on ${pattern}`, err);
        this.channel?.nack(msg, false, false);
      }
    });

    this.logger.log(`Subscribed to: ${pattern} on queue: ${queueName}`);
  }
}
