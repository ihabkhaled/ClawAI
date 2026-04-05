import { Logger } from '@nestjs/common';
import { type EventPattern, type ServerLogPayload, LogLevel } from '@claw/shared-types';
import { type RabbitMQService } from './rabbitmq.service';

export type StructuredLogParams = Omit<ServerLogPayload, 'timestamp' | 'serviceName' | 'level'> & {
  level: LogLevel;
};

export class StructuredLogger {
  private readonly logger: Logger;
  private readonly eventPattern: EventPattern;

  constructor(
    private readonly rabbitMQ: RabbitMQService,
    private readonly serviceName: string,
    eventPattern: EventPattern,
    context?: string,
  ) {
    this.logger = new Logger(context ?? serviceName);
    this.eventPattern = eventPattern;
  }

  logAction(params: StructuredLogParams): void {
    const localMsg = `[${params.action ?? ''}] ${params.message}`;

    switch (params.level) {
      case LogLevel.ERROR:
        this.logger.error(localMsg);
        break;
      case LogLevel.WARN:
        this.logger.warn(localMsg);
        break;
      case LogLevel.DEBUG:
        this.logger.debug(localMsg);
        break;
      case LogLevel.INFO:
      default:
        this.logger.log(localMsg);
        break;
    }

    const payload: ServerLogPayload = {
      level: params.level,
      message: params.message,
      serviceName: this.serviceName,
      module: params.module,
      controller: params.controller,
      service: params.service,
      manager: params.manager,
      repository: params.repository,
      action: params.action,
      route: params.route,
      method: params.method,
      statusCode: params.statusCode,
      requestId: params.requestId,
      traceId: params.traceId,
      userId: params.userId,
      threadId: params.threadId,
      messageId: params.messageId,
      connectorId: params.connectorId,
      provider: params.provider,
      model: params.model,
      latencyMs: params.latencyMs,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      errorStack: params.errorStack,
      metadata: params.metadata,
      timestamp: new Date().toISOString(),
    };

    void this.rabbitMQ.publish(this.eventPattern, payload).catch(() => {
      // Never let logging break the service
    });
  }
}
