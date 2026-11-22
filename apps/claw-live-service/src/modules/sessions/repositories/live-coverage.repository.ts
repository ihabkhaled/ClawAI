import { Injectable } from '@nestjs/common';

import { type LiveSessionCoverage } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

/** LiveSessionCoverage: media-time intervals actually played with AI active. */
@Injectable()
export class LiveCoverageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The session's current (most recent) interval on this run. */
  latest(sessionId: string, runId: string): Promise<LiveSessionCoverage | null> {
    return this.prisma.liveSessionCoverage.findFirst({
      where: { sessionId, runId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async extend(coverageId: string, toAt: bigint): Promise<void> {
    await this.prisma.liveSessionCoverage.update({ where: { id: coverageId }, data: { toAt } });
  }

  async markGap(coverageId: string): Promise<void> {
    await this.prisma.liveSessionCoverage.update({
      where: { id: coverageId },
      data: { endsInGap: true },
    });
  }

  async open(sessionId: string, runId: string, at: bigint): Promise<void> {
    await this.prisma.liveSessionCoverage.create({
      data: { sessionId, runId, fromAt: at, toAt: at },
    });
  }
}
