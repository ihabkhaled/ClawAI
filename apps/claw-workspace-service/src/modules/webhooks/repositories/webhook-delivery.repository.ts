import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  CreateWebhookDeliveryInput,
  ListWebhookDeliveriesFilters,
} from '../types/webhook-repository.types';
import type { Prisma, WebhookDelivery, WorkspaceProvider } from '../../../generated/prisma';

@Injectable()
export class WebhookDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateWebhookDeliveryInput): Promise<WebhookDelivery> {
    return this.prisma.webhookDelivery.create({
      data: {
        connectorId: input.connectorId,
        provider: input.provider,
        externalDeliveryId: input.externalDeliveryId,
        eventType: input.eventType,
        signatureValid: input.signatureValid,
        signature: input.signature,
        rawPayload: input.rawPayload,
        errorMessage: input.errorMessage,
        ipAddress: input.ipAddress,
        bodyBytes: input.bodyBytes,
      },
    });
  }

  async findByExternalId(
    provider: WorkspaceProvider,
    externalDeliveryId: string,
  ): Promise<WebhookDelivery | null> {
    return this.prisma.webhookDelivery.findUnique({
      where: { provider_externalDeliveryId: { provider, externalDeliveryId } },
    });
  }

  async findById(id: string): Promise<WebhookDelivery | null> {
    return this.prisma.webhookDelivery.findUnique({ where: { id } });
  }

  async list(filters: ListWebhookDeliveriesFilters): Promise<WebhookDelivery[]> {
    const where: Prisma.WebhookDeliveryWhereInput = {};
    if (filters.provider !== undefined) where.provider = filters.provider;
    if (filters.signatureValid !== undefined) where.signatureValid = filters.signatureValid;
    if (filters.connectorId !== undefined) where.connectorId = filters.connectorId;
    return this.prisma.webhookDelivery.findMany({
      where,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
      ...(filters.cursor !== undefined ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    });
  }

  async markProcessed(id: string): Promise<void> {
    await this.prisma.webhookDelivery.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }

  // Post-pack hardening — durable signal for a publish outcome. Called
  // with `failed: true` right after a swallowed RabbitMQ publish error,
  // and with `failed: false` on the next publish for this row that
  // succeeds (e.g. a later replay), clearing the flag back to null.
  async setPublishFailed(id: string, failed: boolean): Promise<void> {
    await this.prisma.webhookDelivery.update({
      where: { id },
      data: { publishFailedAt: failed ? new Date() : null },
    });
  }
}
