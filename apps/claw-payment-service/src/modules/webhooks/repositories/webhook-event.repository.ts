import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventStatus } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { WebhookEvent } from '../../../generated/prisma';
import type { RecordWebhookData } from '../types/webhook-repository.types';

// Pure data access for inbound gateway webhooks.
//
// The row is written BEFORE any business state changes, so a replay is caught
// by the (gateway, providerEventId) unique index rather than by hoping every
// downstream handler happens to be idempotent.
@Injectable()
export class WebhookEventRepository {
  private readonly logger = new Logger(WebhookEventRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // Claims an event id. Returns null when the gateway has sent this event
  // before — the caller treats that as a duplicate and does nothing further.
  //
  // `createMany` with skipDuplicates lets the database arbitrate: two replicas
  // receiving the same retry concurrently cannot both win.
  async claim(data: RecordWebhookData): Promise<WebhookEvent | null> {
    this.logger.debug(`claim: gateway=${data.gateway} type=${data.eventType}`);
    const result = await this.prisma.webhookEvent.createMany({
      data: [{ ...data, status: WebhookEventStatus.RECEIVED }],
      skipDuplicates: true,
    });
    if (result.count === 0) {
      this.logger.warn(
        `claim: duplicate webhook gateway=${data.gateway} type=${data.eventType} — ignored`,
      );
      return null;
    }
    return this.findByProviderEventId(data.gateway, data.providerEventId);
  }

  async findByProviderEventId(
    gateway: string,
    providerEventId: string,
  ): Promise<WebhookEvent | null> {
    this.logger.debug(`findByProviderEventId: gateway=${gateway}`);
    return this.prisma.webhookEvent.findUnique({
      where: { gateway_providerEventId: { gateway, providerEventId } },
    });
  }

  async markProcessing(id: string): Promise<WebhookEvent> {
    this.logger.debug(`markProcessing: ${id}`);
    return this.prisma.webhookEvent.update({
      where: { id },
      data: { status: WebhookEventStatus.PROCESSING, attempts: { increment: 1 } },
    });
  }

  async markProcessed(
    id: string,
    relatedSubscriptionId: string | null,
    relatedTransactionId: string | null,
  ): Promise<WebhookEvent> {
    this.logger.debug(`markProcessed: ${id}`);
    return this.prisma.webhookEvent.update({
      where: { id },
      data: {
        status: WebhookEventStatus.PROCESSED,
        processedAt: new Date(),
        relatedSubscriptionId,
        relatedTransactionId,
      },
    });
  }

  // `errorCode` is a stable machine code. A provider error body must never
  // reach this column.
  async markFailed(id: string, errorCode: string): Promise<WebhookEvent> {
    this.logger.error(`markFailed: ${id} code=${errorCode}`);
    return this.prisma.webhookEvent.update({
      where: { id },
      data: { status: WebhookEventStatus.FAILED, errorCode },
    });
  }

  async markIgnored(id: string): Promise<WebhookEvent> {
    this.logger.debug(`markIgnored: ${id}`);
    return this.prisma.webhookEvent.update({
      where: { id },
      data: { status: WebhookEventStatus.IGNORED, processedAt: new Date() },
    });
  }

  // Records a rejected signature. Written even though nothing is processed, so
  // a forgery attempt is visible to the security dashboard rather than silent.
  async recordInvalidSignature(data: RecordWebhookData): Promise<void> {
    this.logger.error(`recordInvalidSignature: gateway=${data.gateway} type=${data.eventType}`);
    await this.prisma.webhookEvent.createMany({
      data: [{ ...data, signatureValid: false, status: WebhookEventStatus.SIGNATURE_INVALID }],
      skipDuplicates: true,
    });
  }

  // Verified-but-unprocessed events, for the reconciliation sweep.
  async findRetryable(maxAttempts: number, limit: number): Promise<WebhookEvent[]> {
    this.logger.debug(`findRetryable: maxAttempts=${String(maxAttempts)}`);
    return this.prisma.webhookEvent.findMany({
      where: {
        status: WebhookEventStatus.FAILED,
        signatureValid: true,
        attempts: { lt: maxAttempts },
      },
      orderBy: { receivedAt: 'asc' },
      take: limit,
    });
  }

  async countByStatus(status: WebhookEventStatus): Promise<number> {
    this.logger.debug(`countByStatus: ${status}`);
    return this.prisma.webhookEvent.count({ where: { status } });
  }
}
