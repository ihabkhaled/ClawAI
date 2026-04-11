export interface RabbitMQModuleOptions {
  url: string;
  exchangeName?: string;
  queuePrefix?: string;
  serviceName: string;
}

export type PendingSubscription = {
  pattern: string;
  handler: (data: unknown) => Promise<void>;
};

export const RABBITMQ_MODULE_OPTIONS = 'RABBITMQ_MODULE_OPTIONS';
