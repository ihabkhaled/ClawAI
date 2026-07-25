import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  IDEMPOTENCY_STATUS_COMPLETED,
  IDEMPOTENCY_STATUS_IN_PROGRESS,
} from '../constants/idempotency.constants';
import type { IdempotencyRecord, Prisma } from '../../../generated/prisma';
import type { ClaimIdempotencyData } from '../types/idempotency-repository.types';

// Pure data access for replay protection on financial writes.
@Injectable()
export class IdempotencyRepository {
  private readonly logger = new Logger(IdempotencyRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // Attempts to claim (user, operation, key). Returns null when the key is
  // already taken — the caller then inspects the existing record to decide
  // between replaying its response and rejecting a key reused with a different
  // body. Letting the unique index arbitrate is what makes this safe under
  // concurrent retries.
  async claim(data: ClaimIdempotencyData): Promise<IdempotencyRecord | null> {
    this.logger.debug(`claim: op=${data.operation} user=${data.userId}`);
    const result = await this.prisma.idempotencyRecord.createMany({
      data: [{ ...data, status: IDEMPOTENCY_STATUS_IN_PROGRESS }],
      skipDuplicates: true,
    });
    if (result.count === 0) {
      this.logger.warn(`claim: key already in use op=${data.operation} user=${data.userId}`);
      return null;
    }
    return this.find(data.userId, data.operation, data.key);
  }

  async find(userId: string, operation: string, key: string): Promise<IdempotencyRecord | null> {
    this.logger.debug(`find: op=${operation} user=${userId}`);
    return this.prisma.idempotencyRecord.findUnique({
      where: { userId_operation_key: { userId, operation, key } },
    });
  }

  async complete(
    id: string,
    responseJson: Prisma.InputJsonValue,
    responseStatusCode: number,
  ): Promise<IdempotencyRecord> {
    this.logger.debug(`complete: ${id} status=${String(responseStatusCode)}`);
    return this.prisma.idempotencyRecord.update({
      where: { id },
      data: { status: IDEMPOTENCY_STATUS_COMPLETED, responseJson, responseStatusCode },
    });
  }

  // Releases a claim whose operation failed before producing a result, so the
  // caller can legitimately retry with the same key.
  async release(id: string): Promise<void> {
    this.logger.debug(`release: ${id}`);
    await this.prisma.idempotencyRecord.delete({ where: { id } });
  }

  async deleteExpired(now: Date, limit: number): Promise<number> {
    this.logger.debug(`deleteExpired: before=${now.toISOString()}`);
    const expired = await this.prisma.idempotencyRecord.findMany({
      where: { expiresAt: { lte: now } },
      take: limit,
      select: { id: true },
    });
    if (expired.length === 0) {
      return 0;
    }
    const result = await this.prisma.idempotencyRecord.deleteMany({
      where: { id: { in: expired.map((row) => row.id) } },
    });
    return result.count;
  }
}
