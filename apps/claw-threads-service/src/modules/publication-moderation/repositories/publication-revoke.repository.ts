import { Injectable } from '@nestjs/common';

import { PublicationRevokeOutcome } from '../../../common/enums/publication-revoke-outcome.enum';
import { PublicationStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class PublicationRevokeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Sets REVOKED once; a repeat reports ALREADY_REVOKED and changes nothing. */
  async revoke(publicationId: string): Promise<PublicationRevokeOutcome> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.threadPublication.findUnique({
        where: { id: publicationId },
        select: { status: true },
      });
      if (!existing) return PublicationRevokeOutcome.NOT_FOUND;
      if (existing.status === PublicationStatus.REVOKED) {
        return PublicationRevokeOutcome.ALREADY_REVOKED;
      }
      await transaction.threadPublication.update({
        where: { id: publicationId },
        data: { status: PublicationStatus.REVOKED },
      });
      return PublicationRevokeOutcome.REVOKED;
    });
  }

  /** The publication (and comment) an open report points at, or null when it is not open. */
  async findOpenReportTarget(
    reportId: string,
  ): Promise<{ publicationId: string; commentId: string | null } | null> {
    return this.prisma.threadPublicationReport.findFirst({
      where: { id: reportId, status: 'OPEN' },
      select: { publicationId: true, commentId: true },
    });
  }
}
