export interface RabbitMQModuleOptions {
  url: string;
  exchangeName?: string;
  queuePrefix?: string;
  serviceName: string;
  /**
   * Maximum unacked messages a single consumer holds at once. Defaults to 50.
   *
   * Without this, RabbitMQ floods the consumer with every queued message and
   * the in-process Promise queue grows faster than the handler can drain —
   * heap exhaustion in seconds for high-volume consumers like
   * server-logs-service. Set higher for low-throughput consumers, lower
   * (e.g. 10) for very expensive handlers.
   */
  prefetchCount?: number;
}

export type PendingSubscription = {
  pattern: string;
  handler: (data: unknown) => Promise<void>;
};

export const RABBITMQ_MODULE_OPTIONS = 'RABBITMQ_MODULE_OPTIONS';
