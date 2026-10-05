import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  Prisma,
  PublicationCommentStatus,
  PublicationReactionValue,
  PublicationReportStatus,
  PublicationSafetyStatus,
  PublicationStatus,
  RevisionReviewStatus,
} from '../../../generated/prisma';
import { z } from 'zod';

import { PublicationReportResolution } from '../../../common/enums/publication-report-resolution.enum';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  MIN_PUBLICATION_CRITIC_SCORE,
  MIN_PUBLICATION_JUDGE_SCORE,
} from '../constants/publication-review.constants';
import type {
  EditedRevisionRecord,
  OwnedRevisionReviewRecord,
  PublicationExport,
  PublicPublication,
  PublishedPublication,
} from '../types/publication.types';
import type { EditPublicationRevisionDto } from '../dto/edit-publication-revision.dto';
import type { PublicationSafetyResult } from '../types/publication-safety.types';
import type { CreatePublicationChangeRequestDto } from '../dto/create-publication-change-request.dto';
import type { CreatePublicationCommentDto } from '../dto/create-publication-comment.dto';
import type { CreatePublicationReportDto } from '../dto/create-publication-report.dto';
import type { ResolvePublicationChangeRequestDto } from '../dto/resolve-publication-change-request.dto';
import type { SetPublicationReactionDto } from '../dto/set-publication-reaction.dto';
import type {
  ModerationReportView,
  PublicationChangeRequestView,
  PublicationReactionSummary,
  PublicPublicationComment,
} from '../types/publication-community.types';
import { evaluatePublicationSafety } from '../utilities/publication-safety.utility';

@Injectable()
export class PublicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOwnedPublications(ownerId: string): Promise<
    Array<{
      id: string;
      status: PublicationStatus;
      title: string | null;
      updatedAt: Date;
    }>
  > {
    const publications = await this.prisma.threadPublication.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        updatedAt: true,
        revisions: { orderBy: { revision: 'desc' }, take: 1, select: { title: true } },
      },
    });
    return publications.map(({ revisions, ...publication }) => ({
      ...publication,
      title: revisions[0]?.title ?? null,
    }));
  }

  async createQueuedPublication(
    ownerId: string,
    generationJobId: string,
  ): Promise<{ id: string; slug: string; ownerId: string } | null> {
    return this.prisma.$transaction(
      async (transaction) => {
        const accountHash = createHash('sha256').update(ownerId).digest('hex');
        const deleted = await transaction.threadDeletedAccount.findUnique({
          where: { accountHash },
          select: { accountHash: true },
        });
        if (deleted) return null;

        const publication = await transaction.threadPublication.upsert({
          where: { generationJobId },
          create: { ownerId, generationJobId, slug: randomUUID() },
          update: {},
          select: { id: true, slug: true, ownerId: true },
        });
        return publication.ownerId === ownerId
          ? { id: publication.id, slug: publication.slug, ownerId }
          : null;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
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
          status: {
            in: [
              PublicationStatus.READY_FOR_REVIEW,
              PublicationStatus.PUBLISHED,
              PublicationStatus.UNPUBLISHED,
            ],
          },
          revisions: {
            some: {
              reviewStatus: RevisionReviewStatus.READY_FOR_REVIEW,
              safetyStatus: PublicationSafetyStatus.APPROVED,
              indexEligible: true,
            },
          },
        },
        select: {
          id: true,
          slug: true,
          status: true,
          publishedAt: true,
          revisions: {
            where: {
              reviewStatus: RevisionReviewStatus.READY_FOR_REVIEW,
              safetyStatus: PublicationSafetyStatus.APPROVED,
              indexEligible: true,
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
          status: {
            in: [
              PublicationStatus.READY_FOR_REVIEW,
              PublicationStatus.PUBLISHED,
              PublicationStatus.UNPUBLISHED,
            ],
          },
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
          data: {
            status: ready.status,
            publishedAt: ready.status === PublicationStatus.PUBLISHED ? ready.publishedAt : null,
          },
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

  async createEditedRevision(
    publicationId: string,
    ownerId: string,
    input: EditPublicationRevisionDto,
    safety: PublicationSafetyResult,
  ): Promise<EditedRevisionRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const priorRequest = await transaction.threadPublicationRevision.findUnique({
        where: { editIdempotencyKey: input.idempotencyKey },
        select: {
          id: true,
          revision: true,
          reviewStatus: true,
          safetyStatus: true,
          safetyReasons: true,
          editRequestHash: true,
          revalidationJobId: true,
          publication: {
            select: { id: true, ownerId: true, generationJobId: true },
          },
        },
      });
      if (priorRequest) {
        return priorRequest.publication.id === publicationId &&
          priorRequest.publication.ownerId === ownerId &&
          priorRequest.publication.generationJobId
          ? {
              id: priorRequest.id,
              revision: priorRequest.revision,
              generationJobId: priorRequest.publication.generationJobId,
              revalidationJobId: priorRequest.revalidationJobId,
              reviewStatus: priorRequest.reviewStatus,
              safetyApproved: priorRequest.safetyStatus === PublicationSafetyStatus.APPROVED,
              safetyReasons: z.array(z.string()).catch([]).parse(priorRequest.safetyReasons),
              requestMatches: priorRequest.editRequestHash === this.hashEditRequest(input),
              editInProgress: false,
            }
          : null;
      }

      const publication = await transaction.threadPublication.findFirst({
        where: {
          id: publicationId,
          ownerId,
          status: {
            in: [
              PublicationStatus.READY_FOR_REVIEW,
              PublicationStatus.PUBLISHED,
              PublicationStatus.UNPUBLISHED,
            ],
          },
          generationJobId: { not: null },
        },
        select: { id: true, ownerId: true, generationJobId: true, status: true },
      });
      if (!publication?.generationJobId) return null;
      const latest = await transaction.threadPublicationRevision.findFirst({
        where: { publicationId },
        orderBy: { revision: 'desc' },
        select: { id: true, revision: true, reviewStatus: true, revalidationJobId: true },
      });
      if (!latest) return null;
      if (
        latest.reviewStatus === RevisionReviewStatus.PENDING &&
        latest.revalidationJobId !== null
      ) {
        return {
          id: latest.id,
          revision: latest.revision,
          generationJobId: publication.generationJobId,
          revalidationJobId: latest.revalidationJobId,
          reviewStatus: latest.reviewStatus,
          safetyApproved: true,
          safetyReasons: [],
          requestMatches: false,
          editInProgress: true,
        };
      }
      if (publication.status !== PublicationStatus.PUBLISHED) {
        await transaction.threadPublicationRevision.updateMany({
          where: {
            publicationId,
            reviewStatus: RevisionReviewStatus.READY_FOR_REVIEW,
          },
          data: { reviewStatus: RevisionReviewStatus.STALE, indexEligible: false },
        });
      }
      const content = { markdown: input.markdown, citations: input.citations };
      const title = input.markdown.match(/^#\s+(.+)$/mu)?.[1]?.trim() ?? 'Untitled draft';
      const revision = await transaction.threadPublicationRevision.create({
        data: {
          publicationId,
          revision: latest.revision + 1,
          title,
          content,
          contentHash: this.hashPublicationContent(content),
          editIdempotencyKey: input.idempotencyKey,
          editRequestHash: this.hashEditRequest(input),
          reviewStatus: RevisionReviewStatus.PENDING,
          safetyStatus: safety.approved
            ? PublicationSafetyStatus.APPROVED
            : PublicationSafetyStatus.REVIEW_REQUIRED,
          safetyReasons: safety.reasons,
          indexEligible: false,
        },
        select: {
          id: true,
          revision: true,
          reviewStatus: true,
          safetyStatus: true,
          safetyReasons: true,
        },
      });
      return {
        id: revision.id,
        revision: revision.revision,
        generationJobId: publication.generationJobId,
        revalidationJobId: null,
        reviewStatus: revision.reviewStatus,
        safetyApproved: revision.safetyStatus === PublicationSafetyStatus.APPROVED,
        safetyReasons: z.array(z.string()).catch([]).parse(revision.safetyReasons),
        requestMatches: true,
        editInProgress: false,
      };
    });
  }

  async attachRevalidationJob(
    publicationId: string,
    ownerId: string,
    revisionId: string,
    revalidationJobId: string,
  ): Promise<boolean> {
    const attached = await this.prisma.threadPublicationRevision.updateMany({
      where: {
        id: revisionId,
        publicationId,
        reviewStatus: RevisionReviewStatus.PENDING,
        revalidationJobId: null,
        publication: { ownerId },
      },
      data: { revalidationJobId },
    });
    if (attached.count === 1) return true;
    const current = await this.prisma.threadPublicationRevision.findFirst({
      where: { id: revisionId, publicationId, publication: { ownerId } },
      select: { revalidationJobId: true },
    });
    return current?.revalidationJobId === revalidationJobId;
  }

  async findOwnedRevisionReview(
    publicationId: string,
    revisionId: string,
    ownerId: string,
  ): Promise<OwnedRevisionReviewRecord | null> {
    const revision = await this.prisma.threadPublicationRevision.findFirst({
      where: { id: revisionId, publicationId, publication: { ownerId } },
      select: {
        contentHash: true,
        reviewStatus: true,
        safetyStatus: true,
        safetyReasons: true,
        revalidationJobId: true,
      },
    });
    return revision
      ? {
          ...revision,
          safetyApproved: revision.safetyStatus === PublicationSafetyStatus.APPROVED,
          safetyReasons: z.array(z.string()).catch([]).parse(revision.safetyReasons),
        }
      : null;
  }

  async completeRevisionReview(
    publicationId: string,
    ownerId: string,
    revisionId: string,
    result: {
      contentHash: string;
      ready: boolean;
      judgeScore: number | null;
      criticScore: number | null;
    },
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.threadPublicationRevision.updateMany({
        where: {
          id: revisionId,
          publicationId,
          contentHash: result.contentHash,
          reviewStatus: RevisionReviewStatus.PENDING,
          publication: { ownerId },
        },
        data: {
          reviewStatus: result.ready
            ? RevisionReviewStatus.READY_FOR_REVIEW
            : RevisionReviewStatus.STALE,
          judgeScore: result.judgeScore,
          criticScore: result.criticScore,
          validatedAt: new Date(),
          safetyStatus: PublicationSafetyStatus.APPROVED,
          indexEligible: result.ready,
        },
      });
      if (updated.count === 1 && result.ready) {
        await transaction.threadPublication.updateMany({
          where: {
            id: publicationId,
            ownerId,
            status: PublicationStatus.READY_FOR_REVIEW,
          },
          data: { status: PublicationStatus.READY_FOR_REVIEW },
        });
      }
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

  async createPublicComment(
    slug: string,
    authorId: string,
    input: CreatePublicationCommentDto,
  ): Promise<PublicPublicationComment | null> {
    return this.prisma.$transaction(async (transaction) => {
      const publication = await transaction.threadPublication.findFirst({
        where: this.publicPublicationWhere(slug),
        select: { id: true },
      });
      if (!publication) return null;
      return transaction.threadPublicationComment.create({
        data: { publicationId: publication.id, authorId, content: input.content },
        select: { id: true, content: true, createdAt: true },
      });
    });
  }

  async findPublicComments(slug: string): Promise<PublicPublicationComment[] | null> {
    const publication = await this.prisma.threadPublication.findFirst({
      where: this.publicPublicationWhere(slug),
      select: { id: true },
    });
    if (!publication) return null;
    const comments = await this.prisma.threadPublicationComment.findMany({
      where: { publicationId: publication.id, status: PublicationCommentStatus.VISIBLE },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, content: true, createdAt: true },
    });
    return comments.reverse();
  }

  async setPublicReaction(
    slug: string,
    userId: string,
    input: SetPublicationReactionDto,
  ): Promise<PublicationReactionSummary | null> {
    return this.prisma.$transaction(async (transaction) => {
      const publication = await transaction.threadPublication.findFirst({
        where: this.publicPublicationWhere(slug),
        select: { id: true },
      });
      if (!publication) return null;
      const value = input.value as PublicationReactionValue;
      await transaction.threadPublicationReaction.upsert({
        where: { publicationId_userId: { publicationId: publication.id, userId } },
        create: { publicationId: publication.id, userId, value },
        update: { value },
      });
      const [likes, dislikes] = await Promise.all([
        transaction.threadPublicationReaction.count({
          where: { publicationId: publication.id, value: PublicationReactionValue.LIKE },
        }),
        transaction.threadPublicationReaction.count({
          where: { publicationId: publication.id, value: PublicationReactionValue.DISLIKE },
        }),
      ]);
      return { likes, dislikes, viewerReaction: input.value };
    });
  }

  async removePublicReaction(
    slug: string,
    userId: string,
  ): Promise<PublicationReactionSummary | null> {
    return this.prisma.$transaction(async (transaction) => {
      const publication = await transaction.threadPublication.findFirst({
        where: this.publicPublicationWhere(slug),
        select: { id: true },
      });
      if (!publication) return null;
      await transaction.threadPublicationReaction.deleteMany({
        where: { publicationId: publication.id, userId },
      });
      const [likes, dislikes] = await Promise.all([
        transaction.threadPublicationReaction.count({
          where: { publicationId: publication.id, value: PublicationReactionValue.LIKE },
        }),
        transaction.threadPublicationReaction.count({
          where: { publicationId: publication.id, value: PublicationReactionValue.DISLIKE },
        }),
      ]);
      return { likes, dislikes, viewerReaction: null };
    });
  }

  async findPublicReactionSummary(
    slug: string,
    viewerId: string | undefined,
  ): Promise<PublicationReactionSummary | null> {
    const publication = await this.prisma.threadPublication.findFirst({
      where: this.publicPublicationWhere(slug),
      select: { id: true },
    });
    if (!publication) return null;
    const [likes, dislikes, viewer] = await Promise.all([
      this.prisma.threadPublicationReaction.count({
        where: { publicationId: publication.id, value: PublicationReactionValue.LIKE },
      }),
      this.prisma.threadPublicationReaction.count({
        where: { publicationId: publication.id, value: PublicationReactionValue.DISLIKE },
      }),
      viewerId
        ? this.prisma.threadPublicationReaction.findUnique({
            where: { publicationId_userId: { publicationId: publication.id, userId: viewerId } },
            select: { value: true },
          })
        : null,
    ]);
    return { likes, dislikes, viewerReaction: viewer?.value ?? null };
  }

  async createPublicChangeRequest(
    slug: string,
    requesterId: string,
    input: CreatePublicationChangeRequestDto,
  ): Promise<PublicationChangeRequestView | null> {
    return this.prisma.$transaction(async (transaction) => {
      const publication = await transaction.threadPublication.findFirst({
        where: this.publicPublicationWhere(slug),
        select: { id: true },
      });
      if (!publication) return null;
      return transaction.threadPublicationChangeRequest.create({
        data: { publicationId: publication.id, requesterId, suggestion: input.suggestion },
        select: {
          id: true,
          suggestion: true,
          status: true,
          ownerResponse: true,
          acceptedRevisionId: true,
          createdAt: true,
        },
      });
    });
  }

  async findOwnedChangeRequests(
    publicationId: string,
    ownerId: string,
  ): Promise<PublicationChangeRequestView[] | null> {
    const publication = await this.prisma.threadPublication.findFirst({
      where: { id: publicationId, ownerId },
      select: { id: true },
    });
    if (!publication) return null;
    return this.prisma.threadPublicationChangeRequest.findMany({
      where: { publicationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        suggestion: true,
        status: true,
        ownerResponse: true,
        acceptedRevisionId: true,
        createdAt: true,
      },
    });
  }

  async findOwnedChangeRequest(
    publicationId: string,
    ownerId: string,
    requestId: string,
  ): Promise<PublicationChangeRequestView | null> {
    return this.prisma.threadPublicationChangeRequest.findFirst({
      where: { id: requestId, publicationId, publication: { ownerId } },
      select: {
        id: true,
        suggestion: true,
        status: true,
        ownerResponse: true,
        acceptedRevisionId: true,
        createdAt: true,
      },
    });
  }

  async resolveOwnedChangeRequest(
    publicationId: string,
    ownerId: string,
    requestId: string,
    input: ResolvePublicationChangeRequestDto,
    acceptedRevisionId: string | null,
  ): Promise<boolean> {
    const result = await this.prisma.threadPublicationChangeRequest.updateMany({
      where: {
        id: requestId,
        publicationId,
        status: 'PENDING',
        publication: { ownerId },
      },
      data: {
        status: input.status,
        ownerResponse: input.ownerResponse ?? null,
        acceptedRevisionId,
      },
    });
    return result.count === 1;
  }

  async createPublicReport(
    slug: string,
    reporterId: string,
    input: CreatePublicationReportDto,
  ): Promise<{ id: string; status: 'OPEN' } | null> {
    return this.prisma.$transaction(async (transaction) => {
      const publication = await transaction.threadPublication.findFirst({
        where: this.publicPublicationWhere(slug),
        select: { id: true },
      });
      if (!publication) return null;
      if (input.commentId) {
        const comment = await transaction.threadPublicationComment.findFirst({
          where: {
            id: input.commentId,
            publicationId: publication.id,
            status: PublicationCommentStatus.VISIBLE,
          },
          select: { id: true },
        });
        if (!comment) return null;
      }
      const report = await transaction.threadPublicationReport.create({
        data: {
          publicationId: publication.id,
          commentId: input.commentId,
          reporterId,
          reason: input.reason,
          details: input.details,
        },
        select: { id: true, status: true },
      });
      return { id: report.id, status: 'OPEN' as const };
    });
  }

  async findOpenModerationReports(limit = 100): Promise<ModerationReportView[]> {
    return this.prisma.threadPublicationReport.findMany({
      where: { status: PublicationReportStatus.OPEN },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        publicationId: true,
        commentId: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async resolveModerationReport(
    reportId: string,
    moderatorId: string,
    status: PublicationReportResolution,
    hideComment: boolean,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const report = await transaction.threadPublicationReport.findFirst({
        where: { id: reportId, status: PublicationReportStatus.OPEN },
        select: { id: true, commentId: true },
      });
      if (!report) return false;
      const updated = await transaction.threadPublicationReport.updateMany({
        where: { id: reportId, status: PublicationReportStatus.OPEN },
        data: {
          status:
            status === PublicationReportResolution.RESOLVED
              ? PublicationReportStatus.RESOLVED
              : PublicationReportStatus.DISMISSED,
          moderatedBy: moderatorId,
          moderatedAt: new Date(),
        },
      });
      if (updated.count !== 1) return false;
      if (hideComment && report.commentId) {
        await transaction.threadPublicationComment.updateMany({
          where: { id: report.commentId, status: PublicationCommentStatus.VISIBLE },
          data: { status: PublicationCommentStatus.HIDDEN },
        });
      }
      return true;
    });
  }

  private publicPublicationWhere(slug: string): Prisma.ThreadPublicationWhereInput {
    return {
      slug,
      status: PublicationStatus.PUBLISHED,
      revisions: {
        some: {
          reviewStatus: RevisionReviewStatus.OWNER_APPROVED,
          safetyStatus: PublicationSafetyStatus.APPROVED,
          indexEligible: true,
        },
      },
    };
  }

  private hashPublicationContent(content: {
    markdown: string;
    citations: Array<{ evidenceId: string; url: string }>;
  }): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          markdown: content.markdown,
          citations: content.citations.map(({ evidenceId, url }) => ({ evidenceId, url })),
        }),
      )
      .digest('hex');
  }

  private hashEditRequest(input: EditPublicationRevisionDto): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          markdown: input.markdown,
          citations: input.citations.map(({ evidenceId, url }) => ({ evidenceId, url })),
          capMicroUsd: input.capMicroUsd,
          correlationId: input.correlationId,
        }),
      )
      .digest('hex');
  }
}
