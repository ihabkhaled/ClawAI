import { Injectable } from '@nestjs/common';

import { InvocationState } from '../../../common/enums/invocation-status.enum';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type InvocationRow } from '../types/audit.types';

/** The invocation audit table. Rows hold hashes and counts, never arguments, results or secrets. */
@Injectable()
export class InvocationAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Writes the row unless (userId, callId) already has one, so a replayed call cannot double up. */
  async insert(row: InvocationRow): Promise<boolean> {
    const result = await this.prisma.pluginInvocation.createMany({
      data: [row],
      skipDuplicates: true,
    });
    return result.count > 0;
  }

  async existsForCall(userId: string, callId: string): Promise<boolean> {
    const row = await this.prisma.pluginInvocation.findFirst({
      where: { userId, callId },
      select: { id: true },
    });
    return row !== null;
  }

  /** Calls that actually reached the runtime since `since` (a refusal for rate does not count against itself). */
  countSince(userId: string, since: Date): Promise<number> {
    return this.prisma.pluginInvocation.count({
      where: {
        userId,
        createdAt: { gte: since },
        status: { not: InvocationState.RATE_LIMITED },
      },
    });
  }
}
