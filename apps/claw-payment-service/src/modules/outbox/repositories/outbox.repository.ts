import { Injectable, Logger } from '@nestjs/common';
import { OutboxEventStatus } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { OutboxEvent, Prisma } from '../../../generated/prisma';
import type { EnqueueOutboxData } from '../types/outbox-repository.types';

// Pure data access for the transactional outbox.
//
// `enqueue` takes a transaction client because the whole point is that the
// event row is written in the SAME transaction as the state change it
// announces. Called outside one, an entitlement event could be lost between
// "payment committed" and "message published".
@Injectable()
export class OutboxRepository {
  private readonly logger = new Logger(OutboxRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async enqueue(tx: Prisma.TransactionClient, data: EnqueueOutboxData): Promise<OutboxEvent> {
    this.logger.debug(`enqueue: pattern=${data.pattern} aggregate=${data.aggregateId}`);
    return tx.outboxEvent.create({
      data: { ...data, status: OutboxEventStatus.PENDING },
    });
  }

  // Claims a batch for this replica. Bumping to PUBLISHING inside a single
  // updateMany means two pollers cannot pick up the same row.
  async claimBatch(limit: number, now: Date): Promise<OutboxEvent[]> {
    this.logger.debug(`claimBatch: limit=${String(limit)}`);
    const candidates = await this.prisma.outboxEvent.findMany({
      where: { status: OutboxEventStatus.PENDING, availableAt: { lte: now } },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });
    if (candidates.length === 0) {
      return [];
    }
    const ids = candidates.map((row) => row.id);
    await this.prisma.outboxEvent.updateMany({
      where: { id: { in: ids }, status: OutboxEventStatus.PENDING },
      data: { status: OutboxEventStatus.PUBLISHING, attempts: { increment: 1 } },
    });
    return this.prisma.outboxEvent.findMany({
      where: { id: { in: ids }, status: OutboxEventStatus.PUBLISHING },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markPublished(id: string): Promise<void> {
    this.logger.debug(`markPublished: ${id}`);
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: OutboxEventStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  // Returns the row to PENDING with a backoff, or dead-letters it once the
  // attempt ceiling is reached so it surfaces on the reconciliation dashboard
  // instead of retrying forever.
  async markFailed(
    id: string,
    attempts: number,
    maxAttempts: number,
    retryAt: Date,
    errorCode: string,
  ): Promise<void> {
    const exhausted = attempts >= maxAttempts;
    this.logger[exhausted ? 'error' : 'warn'](
      `markFailed: ${id} attempts=${String(attempts)} code=${errorCode} exhausted=${String(exhausted)}`,
    );
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: exhausted ? OutboxEventStatus.DEAD_LETTERED : OutboxEventStatus.PENDING,
        availableAt: retryAt,
        lastErrorCode: errorCode,
      },
    });
  }

  // Rows stuck in PUBLISHING because a replica died mid-drain. Returning them
  // to PENDING is safe: the consumer's inbox de-duplicates on eventId, so a
  // double publish cannot double-apply.
  async recoverStalled(stalledBefore: Date, limit: number): Promise<number> {
    this.logger.debug(`recoverStalled: before=${stalledBefore.toISOString()}`);
    const stalled = await this.prisma.outboxEvent.findMany({
      where: { status: OutboxEventStatus.PUBLISHING, updatedAt: { lte: stalledBefore } },
      take: limit,
      select: { id: true },
    });
    if (stalled.length === 0) {
      return 0;
    }
    const result = await this.prisma.outboxEvent.updateMany({
      where: { id: { in: stalled.map((row) => row.id) } },
      data: { status: OutboxEventStatus.PENDING },
    });
    this.logger.warn(`recoverStalled: returned ${String(result.count)} row(s) to PENDING`);
    return result.count;
  }

  async countByStatus(status: OutboxEventStatus): Promise<number> {
    this.logger.debug(`countByStatus: ${status}`);
    return this.prisma.outboxEvent.count({ where: { status } });
  }
}
