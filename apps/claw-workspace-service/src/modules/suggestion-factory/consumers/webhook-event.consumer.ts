import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { SuggestionFactoryManager } from '../managers/suggestion-factory.manager';
import type { WebhookReceivedEvent } from '../types/webhook-event.types';

@Injectable()
export class WebhookEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(WebhookEventConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly factory: SuggestionFactoryManager,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.subscribe(EventPattern.WORKSPACE_WEBHOOK_RECEIVED, (raw) =>
      this.handle(raw as WebhookReceivedEvent),
    );
    this.logger.log(`Subscribed to event: ${EventPattern.WORKSPACE_WEBHOOK_RECEIVED}`);
  }

  async handle(payload: WebhookReceivedEvent): Promise<void> {
    if (payload.connectorId === null) {
      this.logger.debug(`webhook event without connectorId — skipping factory`);
      return;
    }
    const userId = await this.resolveUserId(payload.connectorId);
    if (userId === null) {
      this.logger.warn(`webhook event for unknown connector ${payload.connectorId}`);
      return;
    }
    await this.factory.process({
      eventType: EventPattern.WORKSPACE_WEBHOOK_RECEIVED,
      provider: payload.provider,
      connectorId: payload.connectorId,
      userId,
      body: payload.body,
      sourceObjectId: payload.externalDeliveryId,
    });
  }

  private async resolveUserId(connectorId: string): Promise<string | null> {
    const connector = await this.prisma.workspaceConnector.findUnique({
      where: { id: connectorId },
      select: { userId: true },
    });
    return connector?.userId ?? null;
  }
}
