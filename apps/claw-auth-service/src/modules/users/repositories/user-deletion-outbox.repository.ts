import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { type UserDeletionOutboxEvent } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { USER_DELETION_OUTBOX_BATCH_SIZE } from '../constants/user-deletion-outbox.constants';

@Injectable()
export class UserDeletionOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async deleteAccount(userId: string, deletedAt = new Date()): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: deletedAt },
      });
      await transaction.user.delete({ where: { id: userId } });
      await transaction.userDeletionOutboxEvent.create({
        data: {
          eventId: randomUUID(),
          userId,
          userIdDigest: this.digestUserId(userId),
          deletedAt,
        },
      });
    });
  }

  async recoverStalled(stalledBefore: Date): Promise<void> {
    await this.prisma.userDeletionOutboxEvent.updateMany({
      where: { status: 'PUBLISHING', updatedAt: { lte: stalledBefore } },
      data: { status: 'PENDING' },
    });
  }

  async claimBatch(now: Date): Promise<UserDeletionOutboxEvent[]> {
    const candidates = await this.prisma.userDeletionOutboxEvent.findMany({
      where: { status: 'PENDING', availableAt: { lte: now } },
      orderBy: { createdAt: 'asc' },
      take: USER_DELETION_OUTBOX_BATCH_SIZE,
      select: { id: true },
    });
    const claimed: UserDeletionOutboxEvent[] = [];
    for (const candidate of candidates) {
      const result = await this.prisma.userDeletionOutboxEvent.updateMany({
        where: { id: candidate.id, status: 'PENDING' },
        data: { status: 'PUBLISHING', attempts: { increment: 1 } },
      });
      if (result.count !== 1) continue;
      const event = await this.prisma.userDeletionOutboxEvent.findUnique({
        where: { id: candidate.id },
      });
      if (event) claimed.push(event);
    }
    return claimed;
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.userDeletionOutboxEvent.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        userId: null,
        userIdDigest: null,
        publishedAt: new Date(),
      },
    });
  }

  async markFailed(id: string, attempts: number, retryAt: Date): Promise<void> {
    await this.prisma.userDeletionOutboxEvent.update({
      where: { id },
      data: {
        status: 'PENDING',
        attempts,
        availableAt: retryAt,
        lastErrorCode: 'PUBLISH_FAILED',
      },
    });
  }

  private digestUserId(userId: string): string {
    return createHash('sha256').update(userId).digest('hex');
  }
}
