import { ConsoleLogger, Injectable, type LoggerService } from '@nestjs/common';

import { type RabbitMQService } from './rabbitmq.service';

const SKIP_CONTEXTS = new Set([
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
  'NestFactory',
  'NestApplication',
  'NestMicroservice',
  'ExceptionsHandler',
  'ThrottlerGuard',
  'pinoHttp',
]);

@Injectable()
export class RabbitMQLoggerService extends ConsoleLogger implements LoggerService {
  private rabbitMQ: RabbitMQService | null = null;
  private serviceName = 'unknown-service';
  private publishing = false;

  setRabbitMQ(rabbitMQ: RabbitMQService, serviceName: string): void {
    this.rabbitMQ = rabbitMQ;
    this.serviceName = serviceName;
  }

  override log(message: unknown, ...optionalParams: unknown[]): void {
    super.log(message, ...optionalParams);
    this.publishLog('INFO', message, optionalParams);
  }

  override error(message: unknown, ...optionalParams: unknown[]): void {
    super.error(message, ...optionalParams);
    this.publishLog('ERROR', message, optionalParams);
  }

  override warn(message: unknown, ...optionalParams: unknown[]): void {
    super.warn(message, ...optionalParams);
    this.publishLog('WARN', message, optionalParams);
  }

  override debug(message: unknown, ...optionalParams: unknown[]): void {
    super.debug(message, ...optionalParams);
  }

  private publishLog(level: string, message: unknown, optionalParams: unknown[]): void {
    if (!this.rabbitMQ || this.publishing) {
      return;
    }

    const context = typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;

    if (context && SKIP_CONTEXTS.has(context)) {
      return;
    }

    this.publishing = true;

    const msgStr = typeof message === 'string' ? message : JSON.stringify(message);

    void this.rabbitMQ
      .publish('log.server', {
        level,
        message: msgStr,
        serviceName: this.serviceName,
        module: context,
        action: 'app-log',
        timestamp: new Date().toISOString(),
      })
      .catch(() => {})
      .finally(() => {
        this.publishing = false;
      });
  }
}
