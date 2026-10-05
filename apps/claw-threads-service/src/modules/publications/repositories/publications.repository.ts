import { Injectable } from '@nestjs/common';
import { PublicationStatus, RevisionReviewStatus } from '../../../generated/prisma';
import { z } from 'zod';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { PublishedPublication } from '../types/publication.types';

@Injectable()
export class PublicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async publishReadyRevision(
    publicationId: string,
    ownerId: string,
  ): Promise<PublishedPublication | null> {
    return this.prisma.$transaction(async (transaction) => {
      const ready = await transaction.threadPublication.findFirst({
        where: {
          id: publicationId,
          ownerId,
          status: PublicationStatus.READY_FOR_REVIEW,
          revisions: { some: { reviewStatus: RevisionReviewStatus.READY_FOR_REVIEW } },
        },
        select: {
          id: true,
          slug: true,
          revisions: {
            where: { reviewStatus: RevisionReviewStatus.READY_FOR_REVIEW },
            orderBy: { revision: 'desc' },
            take: 1,
            select: { id: true, title: true, content: true },
          },
        },
      });
      const revision = ready?.revisions[0];
      if (!ready || !revision) return null;
      const content = z.object({ markdown: z.string() }).safeParse(revision.content);
      if (!content.success) return null;

      const changed = await transaction.threadPublication.updateMany({
        where: {
          id: publicationId,
          ownerId,
          status: PublicationStatus.READY_FOR_REVIEW,
        },
        data: { status: PublicationStatus.PUBLISHED, publishedAt: new Date() },
      });
      if (changed.count !== 1) return null;

      const approved = await transaction.threadPublicationRevision.updateMany({
        where: { id: revision.id, reviewStatus: RevisionReviewStatus.READY_FOR_REVIEW },
        data: { reviewStatus: RevisionReviewStatus.OWNER_APPROVED, ownerApprovedAt: new Date() },
      });
      if (approved.count !== 1) {
        await transaction.threadPublication.updateMany({
          where: { id: publicationId, ownerId, status: PublicationStatus.PUBLISHED },
          data: { status: PublicationStatus.READY_FOR_REVIEW, publishedAt: null },
        });
        return null;
      }

      return {
        id: ready.id,
        slug: ready.slug,
        title: revision.title,
        content: { markdown: content.data.markdown },
        publishedAt: new Date(),
      };
    });
  }
}
