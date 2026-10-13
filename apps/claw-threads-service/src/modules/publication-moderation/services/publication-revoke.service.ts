import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';

import { PublicationRevokeOutcome } from '../../../common/enums/publication-revoke-outcome.enum';
import {
  PUBLICATION_REVOKE_AUDIT_EVENT,
  PUBLICATION_REVOKE_DEFAULT_REASON,
} from '../constants/publication-revoke.constants';
import { BOARD_INDEX_PORT, type BoardIndexPort } from '../ports/board-index.port';
import { PublicationRevokeRepository } from '../repositories/publication-revoke.repository';
import type { RevokeResult } from '../types/publication-revoke.types';

@Injectable()
export class PublicationRevokeService {
  private readonly logger = new Logger(PublicationRevokeService.name);

  constructor(
    private readonly repository: PublicationRevokeRepository,
    @Optional() @Inject(BOARD_INDEX_PORT) private readonly boardIndex?: BoardIndexPort,
  ) {}

  async revoke(
    publicationId: string,
    moderatorId: string,
    reason: string | undefined,
  ): Promise<RevokeResult> {
    const outcome = await this.repository.revoke(publicationId);
    if (outcome === PublicationRevokeOutcome.NOT_FOUND) {
      throw new NotFoundException('Publication not found');
    }
    // Idempotent: the index removal also runs on a repeat, so a failed first attempt heals.
    await this.removeFromBoard(publicationId);
    if (outcome === PublicationRevokeOutcome.REVOKED) {
      this.logger.log(
        JSON.stringify({
          event: PUBLICATION_REVOKE_AUDIT_EVENT,
          publicationId,
          moderatorId,
          reason: reason ?? PUBLICATION_REVOKE_DEFAULT_REASON,
        }),
      );
    }
    return {
      revoked: true,
      alreadyRevoked: outcome === PublicationRevokeOutcome.ALREADY_REVOKED,
    };
  }

  /** The target of an open report, so a resolve can revoke the publication when chosen. */
  findOpenReportTarget(
    reportId: string,
  ): ReturnType<PublicationRevokeRepository['findOpenReportTarget']> {
    return this.repository.findOpenReportTarget(reportId);
  }

  private async removeFromBoard(publicationId: string): Promise<void> {
    if (!this.boardIndex) return;
    try {
      await this.boardIndex.removePublication(publicationId);
    } catch (error) {
      this.logger.warn(
        `Board index removal failed for ${publicationId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
