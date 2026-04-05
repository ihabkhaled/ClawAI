import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern, type ServerLogPayload } from '@claw/shared-types';
import { ServerLogsService } from '../services/server-logs.service';

@Injectable()
export class ServerLogEventManager implements OnModuleInit {
  private readonly logger = new Logger(ServerLogEventManager.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly serverLogsService: ServerLogsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.subscribeAll();
  }

  private async subscribeAll(): Promise<void> {
    await this.rabbitMQService.subscribe(
      EventPattern.LOG_SERVER,
      (data) => this.handleServerLog(data as ServerLogPayload),
    );
    this.logger.log(`Subscribed to event: ${EventPattern.LOG_SERVER}`);
  }

  private async handleServerLog(payload: ServerLogPayload): Promise<void> {
    await this.serverLogsService.createLog({
      level: payload.level,
      message: payload.message,
      serviceName: payload.serviceName,
      module: payload.module,
      controller: payload.controller,
      service: payload.service,
      manager: payload.manager,
      repository: payload.repository,
      action: payload.action,
      route: payload.route,
      method: payload.method,
      statusCode: payload.statusCode,
      requestId: payload.requestId,
      traceId: payload.traceId,
      userId: payload.userId,
      threadId: payload.threadId,
      messageId: payload.messageId,
      connectorId: payload.connectorId,
      provider: payload.provider,
      model: payload.model,
      latencyMs: payload.latencyMs,
      errorCode: payload.errorCode,
      errorMessage: payload.errorMessage,
      errorStack: payload.errorStack,
      metadata: payload.metadata,
    });
  }
}
