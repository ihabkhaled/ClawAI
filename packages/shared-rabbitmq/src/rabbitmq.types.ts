export interface RabbitMQModuleOptions {
  url: string;
  exchangeName?: string;
  queuePrefix?: string;
  serviceName: string;
}

export const RABBITMQ_MODULE_OPTIONS = 'RABBITMQ_MODULE_OPTIONS';
