import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type EntitlementInboxEvent, EntitlementInboxStatus } from '../../../generated/prisma';
import { type ClaimInboxEventData } from '../types/entitlement-inbox.types';

@Injectable()
export class EntitlementInboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Claims an event, returning false if it was already seen.
  //
  // createMany({ skipDuplicates }) makes the UNIQUE eventId index the
  // de-duplication point, which is what makes this safe under concurrency: two
  // replicas handed the same redelivery both call this, and the database — not
  // application logic — decides that exactly one of them proceeds.
  async claim(data: ClaimInboxEventData): Promise<boolean> {
    const result = await this.prisma.entitlementInboxEvent.createMany({
      data: [
        {
          eventId: data.eventId,
          eventType: data.eventType,
          schemaVersion: data.schemaVersion,
          producer: data.producer,
          userId: data.userId,
          payloadJson: data.payloadJson,
          effectiveAt: data.effectiveAt,
          status: EntitlementInboxStatus.PENDING,
        },
      ],
      skipDuplicates: true,
    });
    return result.count === 1;
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.prisma.entitlementInboxEvent.update({
      where: { eventId },
      data: { status: EntitlementInboxStatus.PROCESSED, processedAt: new Date() },
    });
  }

  // FAILED rather than deleted: the row is the record that we saw this event,
  // and the reconciliation sweep retries it instead of losing it.
  async markFailed(eventId: string, lastError: string): Promise<void> {
    await this.prisma.entitlementInboxEvent.update({
      where: { eventId },
      data: {
        status: EntitlementInboxStatus.FAILED,
        attempts: { increment: 1 },
        lastError,
      },
    });
  }

  async markSkipped(eventId: string): Promise<void> {
    await this.prisma.entitlementInboxEvent.update({
      where: { eventId },
      data: { status: EntitlementInboxStatus.SKIPPED, processedAt: new Date() },
    });
  }

  async retryFailed(eventId: string): Promise<boolean> {
    const result = await this.prisma.entitlementInboxEvent.updateMany({
      where: { eventId, status: EntitlementInboxStatus.FAILED },
      data: { status: EntitlementInboxStatus.PENDING },
    });
    return result.count === 1;
  }

  async findRetryable(limit: number): Promise<EntitlementInboxEvent[]> {
    return this.prisma.entitlementInboxEvent.findMany({
      where: { status: EntitlementInboxStatus.FAILED },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }
}
