import { Injectable } from '@nestjs/common';

import {
  PublicationSafetyStatus,
  PublicationStatus,
  RevisionReviewStatus,
} from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { PublicationViewCounts } from '../types/publication-view.types';

@Injectable()
export class PublicationViewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Counts one view of a PUBLIC publication (published, owner-approved, safe, indexable;
   * the same fail-closed rule as every public read). A repeat from the same visitor key
   * inside the window is not counted. A signed-in reader is also counted once, ever.
   * Returns null when the slug is not a public publication.
   */
  async recordView(input: {
    slug: string;
    viewerHash: string;
    readerHash: string | null;
    windowStart: Date;
  }): Promise<PublicationViewCounts | null> {
    return this.prisma.$transaction(async (transaction) => {
      const publication = await transaction.threadPublication.findFirst({
        where: {
          slug: input.slug,
          status: PublicationStatus.PUBLISHED,
          revisions: {
            some: {
              reviewStatus: RevisionReviewStatus.OWNER_APPROVED,
              safetyStatus: PublicationSafetyStatus.APPROVED,
              indexEligible: true,
            },
          },
        },
        select: { id: true, viewCount: true, readerCount: true },
      });
      if (!publication) return null;

      const repeat = await transaction.threadPublicationView.findFirst({
        where: {
          publicationId: publication.id,
          viewerHash: input.viewerHash,
          createdAt: { gte: input.windowStart },
        },
        select: { id: true },
      });
      let viewCount = publication.viewCount;
      if (!repeat) {
        await transaction.threadPublicationView.create({
          data: { publicationId: publication.id, viewerHash: input.viewerHash },
        });
        viewCount = (
          await transaction.threadPublication.update({
            where: { id: publication.id },
            data: { viewCount: { increment: 1 } },
            select: { viewCount: true },
          })
        ).viewCount;
      }

      let readerCount = publication.readerCount;
      if (input.readerHash !== null) {
        const created = await transaction.threadPublicationReader.createMany({
          data: [{ publicationId: publication.id, readerHash: input.readerHash }],
          skipDuplicates: true,
        });
        if (created.count > 0) {
          readerCount = (
            await transaction.threadPublication.update({
              where: { id: publication.id },
              data: { readerCount: { increment: 1 } },
              select: { readerCount: true },
            })
          ).readerCount;
        }
      }
      return { viewCount, readerCount };
    });
  }

  /** The counts of a public publication without counting anything (for crawlers). */
  async readCounts(slug: string): Promise<PublicationViewCounts | null> {
    const publication = await this.prisma.threadPublication.findFirst({
      where: {
        slug,
        status: PublicationStatus.PUBLISHED,
        revisions: {
          some: {
            reviewStatus: RevisionReviewStatus.OWNER_APPROVED,
            safetyStatus: PublicationSafetyStatus.APPROVED,
            indexEligible: true,
          },
        },
      },
      select: { viewCount: true, readerCount: true },
    });
    return publication;
  }

  /** Drops raw view rows older than the cutoff. The counters on the publication stay. */
  async purgeViewsBefore(cutoff: Date): Promise<number> {
    const result = await this.prisma.threadPublicationView.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  }
}
