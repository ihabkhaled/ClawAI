import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PublicationStatus, RevisionReviewStatus } from '../../../generated/prisma';
import { z } from 'zod';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { PublishedPublication } from '../types/publication.types';

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
          contentHash: createHash('sha256')
            .update(JSON.stringify({ markdown: draft.markdown, citations: draft.citations }))
            .digest('hex'),
          reviewStatus: RevisionReviewStatus.PENDING,
          judgeScore: draft.judgeScore,
          criticScore: draft.criticScore,
          validatedAt: new Date(),
        },
        update: {},
      });
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
