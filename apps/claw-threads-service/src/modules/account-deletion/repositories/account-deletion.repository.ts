import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  Prisma,
  PublicationSafetyStatus,
  PublicationStatus,
  RevisionReviewStatus,
} from '../../../generated/prisma';
import { AppConfig } from '../../../app/config/app.config';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { hashReader } from '../../publications/utilities/publication-viewer.utility';

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

        const retained = await transaction.threadPublication.findMany({
          where: {
            ownerId: userId,
            status: PublicationStatus.PUBLISHED,
            revisions: {
              some: {
                reviewStatus: RevisionReviewStatus.OWNER_APPROVED,
                safetyStatus: PublicationSafetyStatus.APPROVED,
                indexEligible: true,
              },
            },
          },
          select: { id: true },
        });
        const retainedIds = retained.map(({ id }) => id);

        await transaction.threadPublicationChangeRequest.deleteMany({
          where: {
            status: 'PENDING',
            OR: [{ requesterId: userId }, { publicationId: { in: retainedIds } }],
          },
        });
        await transaction.threadPublicationChangeRequest.updateMany({
          where: { requesterId: userId },
          data: { requesterId: null },
        });
        await transaction.threadPublicationComment.updateMany({
          where: { authorId: userId },
          data: { authorId: null },
        });
        await transaction.threadPublicationReaction.deleteMany({ where: { userId } });
        // A reader is only a keyed hash, but it is still removed with the account, and the
        // distinct-reader count of each publication they read goes down by one.
        const readerHash = hashReader(AppConfig.get().INTER_SERVICE_AUTH_TOKEN, userId);
        const read = await transaction.threadPublicationReader.findMany({
          where: { readerHash },
          select: { publicationId: true },
        });
        if (read.length > 0) {
          await transaction.threadPublicationReader.deleteMany({ where: { readerHash } });
          await transaction.threadPublication.updateMany({
            where: { id: { in: read.map(({ publicationId }) => publicationId) } },
            data: { readerCount: { decrement: 1 } },
          });
        }
        await transaction.threadPublicationReport.updateMany({
          where: { OR: [{ reporterId: userId }, { moderatedBy: userId }] },
          data: { reporterId: null, moderatedBy: null, details: null },
        });

        if (retainedIds.length > 0) {
          await transaction.threadPublication.updateMany({
            where: { id: { in: retainedIds }, ownerId: userId },
            data: {
              ownerId: null,
              generationJobId: null,
              sourceSnapshot: Prisma.DbNull,
              sourceHash: null,
            },
          });
          await transaction.threadPublicationRevision.deleteMany({
            where: {
              publicationId: { in: retainedIds },
              NOT: {
                reviewStatus: RevisionReviewStatus.OWNER_APPROVED,
                safetyStatus: PublicationSafetyStatus.APPROVED,
                indexEligible: true,
              },
            },
          });
        }
        await transaction.threadPublication.deleteMany({
          where: { ownerId: userId, id: { notIn: retainedIds } },
        });
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private accountHash(userId: string): string {
    return createHash('sha256').update(userId).digest('hex');
  }
}
