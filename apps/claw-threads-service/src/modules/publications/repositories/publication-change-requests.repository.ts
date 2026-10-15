import { Injectable } from '@nestjs/common';

import { PublicationChangeRequestStatus, PublicationStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CHANGE_REQUEST_CREDIT_LIMIT,
  CHANGE_REQUEST_LIST_LIMIT,
  CHANGE_REQUEST_VIEW_SELECT,
} from '../constants/publication-change-request.constants';
import { PUBLIC_REVISION_WHERE } from '../constants/public-revision.constants';
import type {
  ChangeDecisionContext,
  MyChangeRequestView,
  OwnerChangeRequestRecord,
  PublicationViewerOwnership,
} from '../types/publication-community.types';
import { publicPublicationWhere } from '../utilities/public-publication-where.utility';
import { readablePublicationTitle } from '../utilities/publication-readable-title.utility';

/**
 * Reads and the one status move that belong to the owner review, "My suggestions" and the public
 * credit line for reader suggestions. Writes that create or decide a suggestion stay in
 * PublicationsRepository next to the rest of the publication rules.
 */
@Injectable()
export class PublicationChangeRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Every suggestion for one publication, newest first; null when the caller does not own it. */
  async findForOwner(
    publicationId: string,
    ownerId: string,
  ): Promise<OwnerChangeRequestRecord[] | null> {
    const publication = await this.prisma.threadPublication.findFirst({
      where: { id: publicationId, ownerId },
      select: { id: true },
    });
    if (!publication) return null;
    return this.prisma.threadPublicationChangeRequest.findMany({
      where: { publicationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: CHANGE_REQUEST_LIST_LIMIT,
      select: { ...CHANGE_REQUEST_VIEW_SELECT, requesterId: true },
    });
  }

  /** The signed-in person's own suggestions with the Thread each one is about. */
  async findMine(requesterId: string): Promise<MyChangeRequestView[]> {
    const rows = await this.prisma.threadPublicationChangeRequest.findMany({
      where: { requesterId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: CHANGE_REQUEST_LIST_LIMIT,
      select: {
        id: true,
        suggestion: true,
        status: true,
        ownerResponse: true,
        createdAt: true,
        updatedAt: true,
        publication: {
          select: {
            slug: true,
            status: true,
            revisions: {
              orderBy: { revision: 'desc' },
              take: 1,
              select: { title: true, content: true },
            },
          },
        },
      },
    });
    return rows.map(({ publication, ...row }) => ({
      ...row,
      thread: {
        slug: publication.slug,
        title: readablePublicationTitle(
          publication.revisions[0]?.title ?? '',
          publication.revisions[0]?.content,
        ),
        isPublic: publication.status === PublicationStatus.PUBLISHED,
      },
    }));
  }

  /** Who the viewer is to a public Thread; only an owner gets the id and the open-request count. */
  async findViewerOwnership(slug: string, viewerId: string): Promise<PublicationViewerOwnership> {
    const publication = await this.prisma.threadPublication.findFirst({
      where: { ...publicPublicationWhere(slug), ownerId: viewerId },
      select: { id: true },
    });
    if (!publication) return { isOwner: false };
    const pendingChangeRequests = await this.prisma.threadPublicationChangeRequest.count({
      where: { publicationId: publication.id, status: PublicationChangeRequestStatus.PENDING },
    });
    return { isOwner: true, publicationId: publication.id, pendingChangeRequests };
  }

  /**
   * People whose suggestion the owner accepted or applied, for the public credit line. Only those
   * two statuses are ever selected: a pending or declined suggestion is never readable here.
   * Null when the Thread is not public.
   */
  async findPublicCreditIds(slug: string): Promise<string[] | null> {
    const publication = await this.prisma.threadPublication.findFirst({
      where: publicPublicationWhere(slug),
      select: { id: true },
    });
    if (!publication) return null;
    const rows = await this.prisma.threadPublicationChangeRequest.findMany({
      where: {
        publicationId: publication.id,
        status: {
          in: [PublicationChangeRequestStatus.ACCEPTED, PublicationChangeRequestStatus.APPLIED],
        },
        requesterId: { not: null },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: CHANGE_REQUEST_CREDIT_LIMIT * 5,
      select: { requesterId: true },
    });
    const ids: string[] = [];
    for (const { requesterId } of rows) {
      if (requesterId !== null && !ids.includes(requesterId)) ids.push(requesterId);
      if (ids.length >= CHANGE_REQUEST_CREDIT_LIMIT) break;
    }
    return ids;
  }

  /** What a decision notice needs: the request, its requester, and the Thread's slug and title. */
  async findDecisionContext(requestId: string): Promise<ChangeDecisionContext | null> {
    const row = await this.prisma.threadPublicationChangeRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        requesterId: true,
        suggestion: true,
        status: true,
        publication: {
          select: {
            id: true,
            slug: true,
            ownerId: true,
            revisions: {
              orderBy: { revision: 'desc' },
              take: 1,
              select: { title: true, content: true },
            },
          },
        },
      },
    });
    if (!row) return null;
    return {
      requestId: row.id,
      requesterId: row.requesterId,
      suggestion: row.suggestion,
      status: row.status,
      publication: {
        id: row.publication.id,
        slug: row.publication.slug,
        ownerId: row.publication.ownerId,
        title: readablePublicationTitle(
          row.publication.revisions[0]?.title ?? '',
          row.publication.revisions[0]?.content,
        ),
      },
    };
  }

  /**
   * After the owner publishes: every ACCEPTED suggestion that the live revision now contains becomes
   * APPLIED. A suggestion accepted with a revised article counts once the live revision is that
   * revision or a later one; one the owner edits themselves counts once a revision newer than the
   * acceptance is live. A repeated publish of an older revision therefore applies nothing. Returns
   * the ids that moved.
   */
  async markAcceptedApplied(publicationId: string): Promise<string[]> {
    const live = await this.prisma.threadPublicationRevision.findFirst({
      where: { publicationId, ...PUBLIC_REVISION_WHERE },
      orderBy: { revision: 'desc' },
      select: { revision: true, createdAt: true },
    });
    if (!live) return [];
    const accepted = await this.prisma.threadPublicationChangeRequest.findMany({
      where: { publicationId, status: PublicationChangeRequestStatus.ACCEPTED },
      select: { id: true, acceptedRevisionId: true, updatedAt: true },
    });
    if (accepted.length === 0) return [];
    const revisionIds = accepted
      .map((request) => request.acceptedRevisionId)
      .filter((id): id is string => id !== null);
    const revisions =
      revisionIds.length === 0
        ? []
        : await this.prisma.threadPublicationRevision.findMany({
            where: { publicationId, id: { in: revisionIds } },
            select: { id: true, revision: true },
          });
    const numberOf = new Map(revisions.map((revision) => [revision.id, revision.revision]));
    const eligible = accepted
      .filter((request) => {
        if (request.acceptedRevisionId === null) return live.createdAt >= request.updatedAt;
        const acceptedNumber = numberOf.get(request.acceptedRevisionId);
        return acceptedNumber !== undefined && live.revision >= acceptedNumber;
      })
      .map((request) => request.id);
    if (eligible.length === 0) return [];
    await this.prisma.threadPublicationChangeRequest.updateMany({
      where: {
        id: { in: eligible },
        publicationId,
        status: PublicationChangeRequestStatus.ACCEPTED,
      },
      data: { status: PublicationChangeRequestStatus.APPLIED },
    });
    return eligible;
  }
}
