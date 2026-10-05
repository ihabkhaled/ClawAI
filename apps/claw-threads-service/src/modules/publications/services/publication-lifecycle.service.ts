import { Injectable, NotFoundException } from '@nestjs/common';

import { PublicationsRepository } from '../repositories/publications.repository';
import type { PublishedPublication } from '../types/publication.types';

@Injectable()
export class PublicationLifecycleService {
  constructor(private readonly publications: PublicationsRepository) {}

  async approveAndPublish(publicationId: string, ownerId: string): Promise<PublishedPublication> {
    const publication = await this.publications.publishReadyRevision(publicationId, ownerId);
    if (!publication) throw new NotFoundException('Publication not found');
    return publication;
  }
}
