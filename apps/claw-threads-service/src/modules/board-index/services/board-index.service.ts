import { Inject, Injectable } from '@nestjs/common';

import { BoardIndexRepository } from '../repositories/board-index.repository';
import type { BoardIndexStore, BoardIndexSyncer } from '../types/board-index.types';
import { buildBoardIndexDoc } from '../utilities/board-index-doc.utility';

/**
 * Keeps the Board search row of one publication in step with its source of truth.
 * A row exists only while the publication passes the public visibility predicate.
 */
@Injectable()
export class BoardIndexService implements BoardIndexSyncer {
  constructor(@Inject(BoardIndexRepository) private readonly repository: BoardIndexStore) {}

  /** Upserts the row when the publication is visible, deletes it otherwise. Returns true if a row now exists. */
  async syncPublication(publicationId: string): Promise<boolean> {
    const source = await this.repository.loadVisibleSource(publicationId);
    if (source === null) {
      await this.repository.deleteDoc(publicationId);
      return false;
    }
    await this.repository.upsertDoc(buildBoardIndexDoc(source));
    return true;
  }

  async removePublication(publicationId: string): Promise<void> {
    await this.repository.deleteDoc(publicationId);
  }
}
