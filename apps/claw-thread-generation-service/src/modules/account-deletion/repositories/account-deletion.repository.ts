import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class AccountDeletionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async applyDeletion(userId: string, eventId: string, deletedAt: Date): Promise<boolean> {
    return this.prisma.$transaction(
      async (transaction) => {
        const inserted = await transaction.threadDeletedAccount.createMany({
          data: [{ accountHash: this.accountHash(userId), eventId, deletedAt }],
          skipDuplicates: true,
        });
        if (inserted.count === 0) return false;
        await transaction.threadGenerationJob.deleteMany({ where: { ownerId: userId } });
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async isDeleted(userId: string): Promise<boolean> {
    const tombstone = await this.prisma.threadDeletedAccount.findUnique({
      where: { accountHash: this.accountHash(userId) },
      select: { accountHash: true },
    });
    return tombstone !== null;
  }

  private accountHash(userId: string): string {
    return createHash('sha256').update(userId).digest('hex');
  }
}
