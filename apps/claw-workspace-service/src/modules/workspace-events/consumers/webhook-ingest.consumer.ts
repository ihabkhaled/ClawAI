import { createHash } from 'node:crypto';

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import type { Prisma } from '../../../generated/prisma';
import type { WebhookReceivedEvent } from '../../suggestion-factory/types/webhook-event.types';
import { WorkspaceEventRepository } from '../repositories/workspace-event.repository';
import { WorkspaceEventMapperService } from '../services/workspace-event-mapper.service';

/**
 * Subscribes to the same WORKSPACE_WEBHOOK_RECEIVED event the
 * suggestion-factory consumer already reacts to, maps the raw payload to a
 * canonical WorkspaceEvent, persists it (deduped), and republishes
 * WORKSPACE_EVENT_INGESTED so future consumers (workflow triggers, the
 * knowledge graph, digest, learning, audit — Phase 05+) can react to the
 * normalized event instead of each re-parsing raw provider payloads.
 *
 * Payload size is already bounded upstream: WebhookReceiverManager rejects
 * anything over WEBHOOK_BODY_MAX_BYTES before a WebhookDelivery row (and
 * therefore this event) is ever created.
 */
@Injectable()
export class WebhookIngestConsumer implements OnModuleInit {
  private readonly logger = new Logger(WebhookIngestConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly mapper: WorkspaceEventMapperService,
    private readonly repo: WorkspaceEventRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.subscribe(EventPattern.WORKSPACE_WEBHOOK_RECEIVED, (raw) =>
      this.handle(raw as WebhookReceivedEvent),
    );
    this.logger.log(`Subscribed to event: ${EventPattern.WORKSPACE_WEBHOOK_RECEIVED}`);
  }

  async handle(payload: WebhookReceivedEvent): Promise<void> {
    const mapping = this.mapper.map(payload.provider, payload.eventType, payload.body);
    if (mapping === null) {
      this.logger.debug(
        `no canonical mapping for ${payload.provider}/${payload.eventType ?? 'unknown'} — delivery ${payload.deliveryId} recorded as raw only`,
      );
      return;
    }

    const idempotencyKey = `${payload.deliveryId}:${mapping.eventType}`;
    const payloadJson = payload.body as Prisma.InputJsonValue;
    const payloadHash = createHash('sha256').update(JSON.stringify(payload.body)).digest('hex');

    const { event, created } = await this.repo.createIfNew({
      connectorId: payload.connectorId,
      provider: payload.provider,
      eventType: mapping.eventType,
      resourceType: mapping.resourceType,
      resourceExternalId: mapping.resourceExternalId,
      occurredAt: mapping.occurredAt,
      correlationId: payload.deliveryId,
      idempotencyKey,
      payload: payloadJson,
      payloadHash,
      sourceDeliveryId: payload.deliveryId,
    });

    if (!created) {
      this.logger.debug(
        `WorkspaceEvent already ingested for delivery ${payload.deliveryId} — skipping republish`,
      );
      return;
    }

    await this.publish(
      event.id,
      event.provider,
      event.eventType,
      event.connectorId,
      event.correlationId,
    );
  }

  private async publish(
    id: string,
    provider: string,
    eventType: string,
    connectorId: string | null,
    correlationId: string,
  ): Promise<void> {
    try {
      await this.rabbitmq.publish(EventPattern.WORKSPACE_EVENT_INGESTED, {
        id,
        provider,
        eventType,
        connectorId,
        correlationId,
        occurredAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `failed to publish ${EventPattern.WORKSPACE_EVENT_INGESTED} — ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
