import { Inject, Injectable } from '@nestjs/common';

import type { BoardCountsPort } from '../../publication-community/ports/board-counts.port';
import { BoardIndexRepository } from '../repositories/board-index.repository';
import { BoardIndexService } from './board-index.service';

/**
 * Backs the community module's counters port. A comment or reaction change re-syncs the whole row,
 * so the counts always come from the source tables (the numbers a caller passes are not trusted).
 * One indexed slug lookup plus the count queries is cheap next to the write it follows.
 */
@Injectable()
export class BoardCountsAdapter implements BoardCountsPort {
  constructor(
    @Inject(BoardIndexRepository) private readonly repository: BoardIndexRepository,
    @Inject(BoardIndexService) private readonly index: BoardIndexService,
  ) {}

  commentsChanged(slug: string): Promise<void> {
    return this.refresh(slug);
  }

  reactionsChanged(slug: string): Promise<void> {
    return this.refresh(slug);
  }

  private async refresh(slug: string): Promise<void> {
    const publicationId = await this.repository.findIdBySlug(slug);
    if (publicationId !== null) await this.index.syncPublication(publicationId);
  }
}
