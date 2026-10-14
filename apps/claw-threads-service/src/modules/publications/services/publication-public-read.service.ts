import { Injectable, NotFoundException } from '@nestjs/common';

import { AuthorIdentityService } from '../../author-identity/services/author-identity.service';
import { PublicationsRepository } from '../repositories/publications.repository';
import type { PublicPublication } from '../types/publication.types';

/** The public Thread page: the publication plus the publisher's name (never an id or an email). */
@Injectable()
export class PublicationPublicReadService {
  constructor(
    private readonly publications: PublicationsRepository,
    private readonly identity: AuthorIdentityService,
  ) {}

  async get(slug: string): Promise<PublicPublication> {
    const found = await this.publications.findPublic(slug);
    if (!found) throw new NotFoundException('Publication not found');
    const { ownerId, ...publication } = found;
    return { ...publication, owner: await this.identity.resolveOne(ownerId) };
  }
}
