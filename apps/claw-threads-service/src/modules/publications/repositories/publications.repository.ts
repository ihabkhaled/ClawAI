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
import type { Locale } from '@claw/shared-types';

import { PublicationReportResolution } from '../../../common/enums/publication-report-resolution.enum';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  MIN_PUBLICATION_CRITIC_SCORE,
  MIN_PUBLICATION_JUDGE_SCORE,
} from '../constants/publication-review.constants';
import { OWNER_DELETABLE_PUBLICATION_STATUSES } from '../constants/publication-generation-owner.constants';
import {
  PUBLISH_RACE_PASSES,
  REPUBLISHABLE_STATUSES,
} from '../constants/publication-publish.constants';
import {
  SERIALIZATION_RETRY_ATTEMPTS,
  SERIALIZATION_RETRY_BASE_DELAY_MS,
} from '../constants/generation-concurrency.constants';
import { withSerializationRetry } from '../../../common/utilities/with-serialization-retry.utility';
import { OWNER_LIST_REVISION_WINDOW } from '../constants/publication-owner-list.constants';
import { latestRevisionContentSchema } from '../schemas/latest-revision-content.schema';
import type {
  LatestRevisionDraft,
  OwnedPublicationListItem,
} from '../types/owner-publication.types';
import {
  isPlaceholderTitle,
  resolvePublicationTitle,
} from '../utilities/publication-readable-title.utility';
import { UNTITLED_PUBLICATION_TITLE } from '../constants/publication-title.constants';
import { pickOwnerListTitle } from '../utilities/owner-list-title.utility';
import type { NotificationPublicationTarget } from '../types/thread-notification.types';
import type {
  EditedRevisionRecord,
  NewPublicationMetadata,
  OwnedRevisionReviewRecord,
  PublicationExport,
  PublicationStartIdentity,
  PublicPublicationDiscoveryItem,
  PublicPublicationRecord,
  PublicPublicationSitemapItem,
  PublishedPublication,
  PublishOutcome,
} from '../types/publication.types';
import type { EditPublicationRevisionDto } from '../dto/edit-publication-revision.dto';
import type { PublicationSafetyResult } from '../types/publication-safety.types';
import type { CreatePublicationChangeRequestDto } from '../dto/create-publication-change-request.dto';
import type { CreatePublicationReportDto } from '../dto/create-publication-report.dto';
import type { ResolvePublicationChangeRequestDto } from '../dto/resolve-publication-change-request.dto';
import type { SetPublicationReactionDto } from '../dto/set-publication-reaction.dto';
import {
  MAX_PENDING_CHANGE_REQUESTS_PER_PUBLICATION,
  MAX_PENDING_CHANGE_REQUESTS_PER_USER,
} from '../constants/publication-change-request.constants';
import type {
  CreateChangeRequestOutcome,
  ModerationReportView,
  PublicationChangeRequestView,
  PublicationReactionSummary,
} from '../types/publication-community.types';
import { publicPublicationWhere } from '../utilities/public-publication-where.utility';
import { evaluatePublicationSafety } from '../utilities/publication-safety.utility';
import {
  derivePublicationSlug,
  derivePublicationTitle,
} from '../utilities/publication-title.utility';
import { resolveCitationMarkers } from '../utilities/citation-marker.utility';
import { publicationExcerpt } from '../utilities/publication-excerpt.utility';

@Injectable()
export class PublicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOwnedPublications(ownerId: string): Promise<OwnedPublicationListItem[]> {
    const publications = await this.prisma.threadPublication.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        slug: true,
        updatedAt: true,
        _count: { select: { changeRequests: { where: { status: 'PENDING' } } } },
        revisions: {
          orderBy: { revision: 'desc' },
          take: OWNER_LIST_REVISION_WINDOW,
          select: {
            title: true,
            reviewStatus: true,
            safetyStatus: true,
            indexEligible: true,
          },
        },
      },
    });
    const items = publications.map(({ revisions, _count, ...publication }) => ({
      ...publication,
      pendingChangeRequests: _count.changeRequests,
      ...pickOwnerListTitle(revisions),
    }));
    return this.resolvePlaceholderTitles(items);
  }

  /** Rows whose title is still the placeholder show the title derived from the newest such article. */
  private async resolvePlaceholderTitles(
    items: OwnedPublicationListItem[],
  ): Promise<OwnedPublicationListItem[]> {
    const pending = items.filter((item) => item.title !== null && isPlaceholderTitle(item.title));
    if (pending.length === 0) return items;
    const rows = await this.prisma.threadPublicationRevision.findMany({
      where: {
        publicationId: { in: pending.map(({ id }) => id) },
        title: UNTITLED_PUBLICATION_TITLE,
      },
      orderBy: { revision: 'desc' },
      distinct: ['publicationId'],
      select: { publicationId: true, title: true, content: true },
    });
    const derived = new Map(
      rows.map((row) => [row.publicationId, resolvePublicationTitle(row.title, row.content)]),
    );
    return items.map((item) => ({ ...item, title: derived.get(item.id) ?? item.title }));
  }

  /**
   * Creates the owner's publication for a freshly queued job, or returns the one that already
   * points at that job. A write conflict (two starts landing together) is retried a few times
   * before it can reach the caller as a 500.
   */
  async createQueuedPublication(
    ownerId: string,
    generationJobId: string,
    metadata: NewPublicationMetadata,
    identity?: PublicationStartIdentity,
  ): Promise<{ id: string; slug: string; ownerId: string } | null> {
    return withSerializationRetry(
      () => this.createQueuedPublicationOnce(ownerId, generationJobId, metadata, identity),
      SERIALIZATION_RETRY_ATTEMPTS,
      SERIALIZATION_RETRY_BASE_DELAY_MS,
    );
  }

  /** The owner's publication that a start with this key already created, if any. */
  async findStartByKey(
    ownerId: string,
    keyHash: string,
  ): Promise<{ id: string; generationJobId: string; requestHash: string | null } | null> {
    const found = await this.prisma.threadPublication.findFirst({
      where: { ownerId, startKeyHash: keyHash, generationJobId: { not: null } },
      select: { id: true, generationJobId: true, startRequestHash: true },
    });
    return found?.generationJobId
      ? {
          id: found.id,
          generationJobId: found.generationJobId,
          requestHash: found.startRequestHash,
        }
      : null;
  }

  /** The owner's newest draft publications and the job each points at: the only ones that can be running. */
  async findDraftJobs(
    ownerId: string,
    limit: number,
  ): Promise<Array<{ publicationId: string; jobId: string }>> {
    const drafts = await this.prisma.threadPublication.findMany({
      where: { ownerId, status: PublicationStatus.DRAFT, generationJobId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, generationJobId: true },
    });
    return drafts.flatMap(({ id, generationJobId }) =>
      generationJobId ? [{ publicationId: id, jobId: generationJobId }] : [],
    );
  }

  /** True when any publication or edit review here points at this generation job. */
  async isJobReferenced(jobId: string): Promise<boolean> {
    const [publication, revision] = await Promise.all([
      this.prisma.threadPublication.findUnique({
        where: { generationJobId: jobId },
        select: { id: true },
      }),
      this.prisma.threadPublicationRevision.findFirst({
        where: { revalidationJobId: jobId },
        select: { id: true },
      }),
    ]);
    return publication !== null || revision !== null;
  }

  private createQueuedPublicationOnce(
    ownerId: string,
    generationJobId: string,
    metadata: NewPublicationMetadata,
    identity: PublicationStartIdentity | undefined,
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
          create: {
            ownerId,
            generationJobId,
            slug: randomUUID(),
            contentLocale: metadata.contentLocale,
            publicationType: metadata.publicationType,
            startKeyHash: identity?.keyHash ?? null,
            startRequestHash: identity?.requestHash ?? null,
          },
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

  async findByGenerationJobId(
    generationJobId: string,
  ): Promise<NotificationPublicationTarget | null> {
    const publication = await this.prisma.threadPublication.findUnique({
      where: { generationJobId },
      select: { id: true, ownerId: true, slug: true },
    });
    // A deleted account has no owner left to tell.
    return publication?.ownerId ? { ...publication, ownerId: publication.ownerId } : null;
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
      gapsDisclosed?: boolean;
    },
  ): Promise<void> {
    // The flag is stored only when true, so every other article keeps the content it always had.
    const gaps = draft.gapsDisclosed === true ? { gapsDisclosed: true } : {};
    const serializedContent = JSON.stringify({
      markdown: draft.markdown,
      citations: draft.citations,
      ...gaps,
    });
    const safety = evaluatePublicationSafety(
      draft.markdown,
      draft.citations.map(({ url }) => url),
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
      const title = derivePublicationTitle(draft.markdown);
      await transaction.threadPublicationRevision.upsert({
        where: { publicationId_revision: { publicationId, revision: 1 } },
        create: {
          publicationId,
          revision: 1,
          title,
          content: { markdown: draft.markdown, citations: draft.citations, ...gaps },
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

  /**
   * Publishes the newest eligible revision. A READY_FOR_REVIEW revision is approved and published;
   * an already approved one is published again after an unpublish (nothing changed, so nothing
   * needs a new review); publishing something already live answers with the live article and
   * `newlyPublished: false`. Two requests landing together cannot both approve: the loser re-reads
   * and gets the idempotent answer.
   */
  async publishReadyRevision(
    publicationId: string,
    ownerId: string,
  ): Promise<PublishOutcome | null> {
    return this.prisma.$transaction(async (transaction) => {
      for (let pass = 0; pass < PUBLISH_RACE_PASSES; pass += 1) {
        const owned = await transaction.threadPublication.findFirst({
          where: { id: publicationId, ownerId },
          select: {
            id: true,
            slug: true,
            status: true,
            publishedAt: true,
            revisions: {
              where: {
                reviewStatus: {
                  in: [RevisionReviewStatus.READY_FOR_REVIEW, RevisionReviewStatus.OWNER_APPROVED],
                },
                safetyStatus: PublicationSafetyStatus.APPROVED,
                indexEligible: true,
              },
              orderBy: { revision: 'desc' },
              take: 1,
              select: { id: true, title: true, content: true, reviewStatus: true },
            },
          },
        });
        if (!owned) return null;
        if (owned.status === PublicationStatus.REVOKED) return { kind: 'REVOKED' };
        const revision = owned.revisions[0];
        if (!revision || owned.status === PublicationStatus.DRAFT) return { kind: 'NOT_READY' };
        const content = z.object({ markdown: z.string() }).safeParse(revision.content);
        if (!content.success) return { kind: 'NOT_READY' };
        // A first publish gives the article a readable slug from its title; a republish keeps its link.
        const readableSlug = owned.publishedAt
          ? null
          : derivePublicationSlug(revision.title, owned.id);
        const firstSlug: { slug?: string } = readableSlug ? { slug: readableSlug } : {};
        const view = (publishedAt: Date): PublishedPublication => ({
          id: owned.id,
          slug: readableSlug ?? owned.slug,
          title: resolvePublicationTitle(revision.title, revision.content),
          content: { markdown: content.data.markdown },
          publishedAt,
        });

        if (revision.reviewStatus === RevisionReviewStatus.OWNER_APPROVED) {
          if (owned.status === PublicationStatus.PUBLISHED) {
            return {
              kind: 'PUBLISHED',
              publication: view(owned.publishedAt ?? new Date()),
              newlyPublished: false,
            };
          }
          const publishedAt = new Date();
          const again = await transaction.threadPublication.updateMany({
            where: { id: publicationId, ownerId, status: { in: REPUBLISHABLE_STATUSES } },
            data: { status: PublicationStatus.PUBLISHED, publishedAt, ...firstSlug },
          });
          if (again.count === 1) {
            return { kind: 'PUBLISHED', publication: view(publishedAt), newlyPublished: true };
          }
          continue;
        }

        const approved = await transaction.threadPublicationRevision.updateMany({
          where: { id: revision.id, reviewStatus: RevisionReviewStatus.READY_FOR_REVIEW },
          data: { reviewStatus: RevisionReviewStatus.OWNER_APPROVED, ownerApprovedAt: new Date() },
        });
        // Another request approved it first: read again and answer from what it committed.
        if (approved.count !== 1) continue;
        const publishedAt = new Date();
        const published = await transaction.threadPublication.updateMany({
          where: { id: publicationId, ownerId, status: { in: REPUBLISHABLE_STATUSES } },
          data: { status: PublicationStatus.PUBLISHED, publishedAt, ...firstSlug },
        });
        if (published.count !== 1) {
          await transaction.threadPublicationRevision.updateMany({
            where: { id: revision.id },
            data: { reviewStatus: RevisionReviewStatus.READY_FOR_REVIEW, ownerApprovedAt: null },
          });
          return { kind: 'NOT_READY' };
        }
        return { kind: 'PUBLISHED', publication: view(publishedAt), newlyPublished: true };
      }
      return { kind: 'NOT_READY' };
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
          // A DRAFT that already holds a stored revision (blocked by the safety scan, or failed
          // its review) is editable too: the owner must be able to remove the offending passage.
          OR: [
            {
              status: {
                in: [
                  PublicationStatus.READY_FOR_REVIEW,
                  PublicationStatus.PUBLISHED,
                  PublicationStatus.UNPUBLISHED,
                ],
              },
            },
            { status: PublicationStatus.DRAFT, revisions: { some: {} } },
          ],
          generationJobId: { not: null },
        },
        select: { id: true, ownerId: true, generationJobId: true, status: true },
      });
      if (!publication?.generationJobId) return null;
      const latest = await transaction.threadPublicationRevision.findFirst({
        where: { publicationId },
        orderBy: { revision: 'desc' },
        select: {
          id: true,
          revision: true,
          reviewStatus: true,
          revalidationJobId: true,
          content: true,
        },
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
      // The last approved revision stays publishable until a NEW revision passes the Critic.
      // An edit keeps the disclosure of the article it edits: the notice is never lost by editing.
      const disclosed = latestRevisionContentSchema.safeParse(latest.content);
      const content = {
        markdown: input.markdown,
        citations: input.citations,
        ...(disclosed.success && disclosed.data.gapsDisclosed === true
          ? { gapsDisclosed: true }
          : {}),
      };
      const title = derivePublicationTitle(input.markdown);
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

  /** Undoes an edit whose review was never admitted: the previous approved revision stays current. */
  async discardUnadmittedRevision(
    publicationId: string,
    ownerId: string,
    revisionId: string,
  ): Promise<boolean> {
    const removed = await this.prisma.threadPublicationRevision.deleteMany({
      where: {
        id: revisionId,
        publicationId,
        reviewStatus: RevisionReviewStatus.PENDING,
        revalidationJobId: null,
        publication: { ownerId },
      },
    });
    return removed.count === 1;
  }

  /** True when an approved, index-eligible revision exists, which is what Publish needs. */
  /**
   * The newest revision the owner could publish now (reviewed, safe, indexable), with its draft.
   * After a passing edit this is the edit, not the original generated draft.
   */
  async findLatestPublishableRevision(
    publicationId: string,
    ownerId: string,
  ): Promise<LatestRevisionDraft | null> {
    const found = await this.prisma.threadPublicationRevision.findFirst({
      where: {
        publicationId,
        publication: { ownerId },
        reviewStatus: {
          in: [RevisionReviewStatus.READY_FOR_REVIEW, RevisionReviewStatus.OWNER_APPROVED],
        },
        safetyStatus: PublicationSafetyStatus.APPROVED,
        indexEligible: true,
      },
      orderBy: { revision: 'desc' },
      select: { content: true, contentHash: true, judgeScore: true, criticScore: true },
    });
    if (!found) return null;
    const content = latestRevisionContentSchema.safeParse(found.content);
    if (!content.success) return null;
    return {
      markdown: content.data.markdown,
      citations: content.data.citations,
      contentHash: found.contentHash,
      judgeScore: found.judgeScore,
      criticScore: found.criticScore,
      ...(content.data.gapsDisclosed === true ? { gapsDisclosed: true } : {}),
    };
  }

  /** The newest stored revision's text and safety verdict, so the owner can be shown what was flagged. */
  async findLatestRevisionSafety(
    publicationId: string,
    ownerId: string,
  ): Promise<{
    blocked: boolean;
    markdown: string;
    citations: Array<{ evidenceId: string; url: string }>;
  } | null> {
    const found = await this.prisma.threadPublicationRevision.findFirst({
      where: { publicationId, publication: { ownerId } },
      orderBy: { revision: 'desc' },
      select: { content: true, safetyStatus: true },
    });
    if (!found) return null;
    const content = latestRevisionContentSchema.safeParse(found.content);
    if (!content.success) return null;
    return {
      blocked: found.safetyStatus !== PublicationSafetyStatus.APPROVED,
      markdown: content.data.markdown,
      citations: content.data.citations,
    };
  }

  async hasPublishableRevision(publicationId: string, ownerId: string): Promise<boolean> {
    const found = await this.prisma.threadPublicationRevision.findFirst({
      where: {
        publicationId,
        publication: { ownerId },
        reviewStatus: {
          in: [RevisionReviewStatus.READY_FOR_REVIEW, RevisionReviewStatus.OWNER_APPROVED],
        },
        safetyStatus: PublicationSafetyStatus.APPROVED,
        indexEligible: true,
      },
      select: { id: true },
    });
    return found !== null;
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
        // The new revision passed: only now do the older unpublished approvals go stale.
        const passed = await transaction.threadPublicationRevision.findUnique({
          where: { id: revisionId },
          select: { revision: true },
        });
        await transaction.threadPublicationRevision.updateMany({
          where: {
            publicationId,
            reviewStatus: RevisionReviewStatus.READY_FOR_REVIEW,
            revision: { lt: passed?.revision ?? 0 },
          },
          data: { reviewStatus: RevisionReviewStatus.STALE, indexEligible: false },
        });
        await transaction.threadPublication.updateMany({
          where: {
            id: publicationId,
            ownerId,
            status: { in: [PublicationStatus.READY_FOR_REVIEW, PublicationStatus.DRAFT] },
          },
          data: { status: PublicationStatus.READY_FOR_REVIEW },
        });
      }
    });
  }

  async findPublic(slug: string): Promise<PublicPublicationRecord | null> {
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
        slug: true,
        ownerId: true,
        contentLocale: true,
        publicationType: true,
        publishedAt: true,
        viewCount: true,
        readerCount: true,
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
        citations: z
          .array(z.object({ url: z.string().url(), evidenceId: z.string().optional() }))
          .default([]),
        gapsDisclosed: z.boolean().optional(),
      })
      .safeParse(revision?.content);
    return publication?.publishedAt && revision && content.success
      ? {
          slug: publication.slug,
          title: resolvePublicationTitle(revision.title, revision.content),
          contentLocale: publication.contentLocale as Locale,
          publicationType:
            publication.publicationType as PublicPublicationRecord['publicationType'],
          // Server-side layer of ADR-183: internal source markers become numbers or vanish before
          // any public reader sees the text; only the addresses leave the service.
          content: {
            markdown: resolveCitationMarkers(
              content.data.markdown,
              content.data.citations.map(({ url, evidenceId }) => ({
                url,
                evidenceId: evidenceId ?? '',
              })),
            ),
            citations: content.data.citations.map(({ url }) => ({ url })),
          },
          gapsDisclosed: content.data.gapsDisclosed === true,
          publishedAt: publication.publishedAt,
          viewCount: publication.viewCount,
          readerCount: publication.readerCount,
          ownerId: publication.ownerId,
        }
      : null;
  }

  async countPublicDiscoveries(contentLocale: Locale | null): Promise<number> {
    return this.prisma.threadPublication.count({ where: this.publicIndexFilter(contentLocale) });
  }

  async findPublicDiscoveries(
    contentLocale: Locale,
    cursor: { slug: string; publishedAt: Date } | null,
    take: number,
  ): Promise<PublicPublicationDiscoveryItem[]> {
    const rows = await this.prisma.threadPublication.findMany({
      where: {
        ...this.publicIndexFilter(contentLocale),
        ...(cursor
          ? {
              OR: [
                { publishedAt: { lt: cursor.publishedAt } },
                { publishedAt: cursor.publishedAt, slug: { lt: cursor.slug } },
              ],
            }
          : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { slug: 'desc' }],
      take,
      select: {
        slug: true,
        contentLocale: true,
        publicationType: true,
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

    return rows.flatMap((row) => {
      const revision = row.revisions[0];
      const content = z.object({ markdown: z.string() }).safeParse(revision?.content);
      if (!revision || !row.publishedAt || !content.success) return [];
      return [
        {
          slug: row.slug,
          title: resolvePublicationTitle(revision.title, revision.content),
          excerpt: publicationExcerpt(content.data.markdown),
          contentLocale: row.contentLocale as Locale,
          publicationType: row.publicationType as PublicPublicationRecord['publicationType'],
          publishedAt: row.publishedAt,
        },
      ];
    });
  }

  /** `contentLocale` null lists every content language (the all-threads sitemap family). */
  async findPublicSitemapItems(
    contentLocale: Locale | null,
    skip: number,
    take: number,
  ): Promise<PublicPublicationSitemapItem[]> {
    const rows = await this.prisma.threadPublication.findMany({
      where: this.publicIndexFilter(contentLocale),
      orderBy: [{ publishedAt: 'desc' }, { slug: 'desc' }],
      skip,
      take,
      select: { slug: true, publishedAt: true },
    });
    return rows.flatMap((row) =>
      row.publishedAt ? [{ slug: row.slug, publishedAt: row.publishedAt }] : [],
    );
  }

  private publicIndexFilter(contentLocale: Locale | null): Prisma.ThreadPublicationWhereInput {
    return {
      status: PublicationStatus.PUBLISHED,
      ...(contentLocale === null ? {} : { contentLocale }),
      publishedAt: { not: null },
      revisions: {
        some: {
          reviewStatus: RevisionReviewStatus.OWNER_APPROVED,
          safetyStatus: PublicationSafetyStatus.APPROVED,
          indexEligible: true,
        },
      },
    };
  }

  async unpublishOwned(publicationId: string, ownerId: string): Promise<boolean> {
    const result = await this.prisma.threadPublication.updateMany({
      where: { id: publicationId, ownerId, status: PublicationStatus.PUBLISHED },
      data: { status: PublicationStatus.UNPUBLISHED, publishedAt: null },
    });
    return result.count === 1;
  }

  /** Points a still-draft publication at a fresh job; false when it moved on or is not the owner's. */
  async attachRetryJob(
    publicationId: string,
    ownerId: string,
    previousJobId: string,
    newJobId: string,
  ): Promise<boolean> {
    const result = await this.prisma.threadPublication.updateMany({
      where: {
        id: publicationId,
        ownerId,
        generationJobId: previousJobId,
        status: PublicationStatus.DRAFT,
      },
      data: { generationJobId: newJobId },
    });
    return result.count === 1;
  }

  /** Removes a DRAFT, READY_FOR_REVIEW or UNPUBLISHED publication (never PUBLISHED or REVOKED); revisions and community rows cascade. */
  async deleteOwnedUnpublished(publicationId: string, ownerId: string): Promise<boolean> {
    const result = await this.prisma.threadPublication.deleteMany({
      where: {
        id: publicationId,
        ownerId,
        status: { in: [...OWNER_DELETABLE_PUBLICATION_STATUSES] },
      },
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

  /**
   * Saves a reader's suggestion under the Thread's row lock, so two suggestions landing together
   * cannot both pass the limits. The owner cannot suggest to themselves.
   */
  async createPublicChangeRequest(
    slug: string,
    requesterId: string,
    input: CreatePublicationChangeRequestDto,
  ): Promise<CreateChangeRequestOutcome> {
    return this.prisma.$transaction(async (transaction) => {
      const publication = await transaction.threadPublication.findFirst({
        where: this.publicPublicationWhere(slug),
        select: { id: true, ownerId: true },
      });
      if (!publication) return { kind: 'NOT_FOUND' };
      if (publication.ownerId === requesterId) return { kind: 'OWN_THREAD' };
      await transaction.$queryRaw`SELECT id FROM thread_publications WHERE id = ${publication.id} FOR UPDATE`;
      const [byThisPerson, onThisThread] = await Promise.all([
        transaction.threadPublicationChangeRequest.count({
          where: { publicationId: publication.id, requesterId, status: 'PENDING' },
        }),
        transaction.threadPublicationChangeRequest.count({
          where: { publicationId: publication.id, status: 'PENDING' },
        }),
      ]);
      if (byThisPerson >= MAX_PENDING_CHANGE_REQUESTS_PER_USER) return { kind: 'USER_LIMIT' };
      if (onThisThread >= MAX_PENDING_CHANGE_REQUESTS_PER_PUBLICATION) {
        return { kind: 'THREAD_LIMIT' };
      }
      const request = await transaction.threadPublicationChangeRequest.create({
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
      return { kind: 'CREATED', request };
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
    return publicPublicationWhere(slug);
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
