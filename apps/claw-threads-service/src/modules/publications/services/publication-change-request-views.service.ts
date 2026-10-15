import { Injectable, NotFoundException } from '@nestjs/common';

import { AuthorIdentityService } from '../../author-identity/services/author-identity.service';
import { PublicationChangeRequestsRepository } from '../repositories/publication-change-requests.repository';
import type {
  MyChangeRequestView,
  OwnerChangeRequestView,
  PublicationChangeCredit,
  PublicationViewerOwnership,
} from '../types/publication-community.types';

/** The read side of reader suggestions: owner review, "My suggestions", credits and ownership. */
@Injectable()
export class PublicationChangeRequestViewsService {
  constructor(
    private readonly requests: PublicationChangeRequestsRepository,
    private readonly identity: AuthorIdentityService,
  ) {}

  /** Every suggestion for the owner's Thread with who made it; another user's id is a 404. */
  async listForOwner(publicationId: string, ownerId: string): Promise<OwnerChangeRequestView[]> {
    const records = await this.requests.findForOwner(publicationId, ownerId);
    if (!records) throw new NotFoundException('Publication not found');
    const names = await this.identity.resolveMany(records.map((record) => record.requesterId));
    return records.map(({ requesterId, ...record }) => ({
      ...record,
      requester: requesterId === null ? null : (names.get(requesterId) ?? null),
    }));
  }

  listMine(requesterId: string): Promise<MyChangeRequestView[]> {
    return this.requests.findMine(requesterId);
  }

  /** Anyone but the owner gets `{ isOwner: false }`: no count, no id. */
  async viewerOwnership(
    slug: string,
    viewerId: string | undefined,
  ): Promise<PublicationViewerOwnership> {
    return viewerId === undefined
      ? { isOwner: false }
      : this.requests.findViewerOwnership(slug, viewerId);
  }

  /** Names only, and only for suggestions the owner accepted or applied. */
  async listCredits(slug: string): Promise<PublicationChangeCredit[]> {
    const ids = await this.requests.findPublicCreditIds(slug);
    if (ids === null) throw new NotFoundException('Publication not found');
    const names = await this.identity.resolveMany(ids);
    const credits: PublicationChangeCredit[] = [];
    for (const id of ids) {
      const author = names.get(id);
      if (author) credits.push({ displayName: author.displayName, username: author.username });
    }
    return credits;
  }
}
