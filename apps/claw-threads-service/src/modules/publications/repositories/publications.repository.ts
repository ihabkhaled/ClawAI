import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  PublicationSafetyStatus,
  PublicationStatus,
  RevisionReviewStatus,
} from '../../../generated/prisma';
import { z } from 'zod';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  MIN_PUBLICATION_CRITIC_SCORE,
  MIN_PUBLICATION_JUDGE_SCORE,
} from '../constants/publication-review.constants';
import type {
  PublicationExport,
  PublicPublication,
  PublishedPublication,
} from '../types/publication.types';
import { evaluatePublicationSafety } from '../utilities/publication-safety.utility';

@Injectable()
export class PublicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createQueuedPublication(
    ownerId: string,
    generationJobId: string,
  ): Promise<{ id: string; slug: string; ownerId: string } | null> {
    const publication = await this.prisma.threadPublication.upsert({
      where: { generationJobId },
      create: { ownerId, generationJobId, slug: randomUUID() },
      update: {},
      select: { id: true, slug: true, ownerId: true },
    });
    return publication.ownerId === ownerId
      ? { id: publication.id, slug: publication.slug, ownerId }
      : null;
  }

  async findOwnedGeneration(
    publicationId: string,
    ownerId: string,
  ): Promise<{
    id: string;
    ownerId: string;
    generationJobId: string | null;
    status: PublicationStatus;
  } | null> {
    const publication = await this.prisma.threadPublication.findFirst({
      where: { id: publicationId, ownerId },
      select: { id: true, ownerId: true, generationJobId: true, status: true },
    });
    return publication?.ownerId === ownerId ? { ...publication, ownerId } : null;
  }

  async savePrivateDraft(
    publicationId: string,
    draft: {
      markdown: string;
      citations: Array<{ evidenceId: string; url: string }>;
      judgeScore: number;
      criticScore: number;
    },
  ): Promise<void> {
    const serializedContent = JSON.stringify({
      markdown: draft.markdown,
      citations: draft.citations,
    });
    const safety = evaluatePublicationSafety(
      [draft.markdown, ...draft.citations.map(({ url }) => url)].join('\n'),
    );
    const reviewReady =
      safety.approved &&
      draft.judgeScore >= MIN_PUBLICATION_JUDGE_SCORE &&
      draft.criticScore >= MIN_PUBLICATION_CRITIC_SCORE;
    await this.prisma.$transaction(async (transaction) => {
      const publication = await transaction.threadPublication.findUnique({
        where: { id: publicationId },
        select: { status: true },
      });
      if (publication?.status !== PublicationStatus.DRAFT) return;
      const title = draft.markdown.match(/^#\s+(.+)$/mu)?.[1]?.trim() ?? 'Untitled draft';
      await transaction.threadPublicationRevision.upsert({
        where: { publicationId_revision: { publicationId, revision: 1 } },
        create: {
          publicationId,
          revision: 1,
          title,
          content: { markdown: draft.markdown, citations: draft.citations },
          contentHash: createHash('sha256').update(serializedContent).digest('hex'),
          reviewStatus: reviewReady
            ? RevisionReviewStatus.READY_FOR_REVIEW
            : RevisionReviewStatus.PENDING,
          judgeScore: draft.judgeScore,
          criticScore: draft.criticScore,
          validatedAt: new Date(),
          safetyStatus: safety.approved
            ? PublicationSafetyStatus.APPROVED
            : PublicationSafetyStatus.REVIEW_REQUIRED,
          safetyReasons: safety.reasons,
          indexEligible: reviewReady,
        },
        update: {},
      });
      if (reviewReady) {
        await transaction.threadPublication.updateMany({
          where: { id: publicationId, status: PublicationStatus.DRAFT },
          data: { status: PublicationStatus.READY_FOR_REVIEW },
        });
      }
    });
  }

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
          revisions: {
            some: {
              reviewStatus: RevisionReviewStatus.READY_FOR_REVIEW,
              safetyStatus: PublicationSafetyStatus.APPROVED,
            },
          },
        },
        select: {
          id: true,
          slug: true,
          revisions: {
            where: {
              reviewStatus: RevisionReviewStatus.READY_FOR_REVIEW,
              safetyStatus: PublicationSafetyStatus.APPROVED,
            },
            orderBy: { revision: 'desc' },
            take: 1,
            select: { id: true, title: true, content: true, indexEligible: true },
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

  async findPublic(slug: string): Promise<PublicPublication | null> {
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
      select: {
        id: true,
        slug: true,
        publishedAt: true,
        revisions: {
          where: {
            reviewStatus: RevisionReviewStatus.OWNER_APPROVED,
            safetyStatus: PublicationSafetyStatus.APPROVED,
            indexEligible: true,
          },
          orderBy: { revision: 'desc' },
          take: 1,
          select: { title: true, content: true },
        },
      },
    });
    const revision = publication?.revisions[0];
    const content = z
      .object({
        markdown: z.string(),
        citations: z.array(z.object({ url: z.string().url() })).default([]),
      })
      .safeParse(revision?.content);
    return publication?.publishedAt && revision && content.success
      ? {
          id: publication.id,
          slug: publication.slug,
          title: revision.title,
          content: content.data,
          publishedAt: publication.publishedAt,
        }
      : null;
  }

  async unpublishOwned(publicationId: string, ownerId: string): Promise<boolean> {
    const result = await this.prisma.threadPublication.updateMany({
      where: { id: publicationId, ownerId, status: PublicationStatus.PUBLISHED },
      data: { status: PublicationStatus.UNPUBLISHED, publishedAt: null },
    });
    return result.count === 1;
  }

  async findOwnedExport(publicationId: string, ownerId: string): Promise<PublicationExport | null> {
    const publication = await this.prisma.threadPublication.findFirst({
      where: { id: publicationId, ownerId },
      select: {
        revisions: {
          orderBy: { revision: 'desc' },
          take: 1,
          select: { title: true, content: true },
        },
      },
    });
    const revision = publication?.revisions[0];
    const content = z
      .object({
        markdown: z.string(),
        citations: z.array(z.object({ url: z.string().url() })).default([]),
      })
      .safeParse(revision?.content);
    return !revision || !content.success
      ? null
      : {
          title: revision.title,
          markdown: content.data.markdown,
          citations: content.data.citations,
        };
  }
}
