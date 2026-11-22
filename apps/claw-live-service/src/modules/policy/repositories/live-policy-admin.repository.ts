import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { LIVE_POLICY_ACTIVE_KEY } from '../constants/live-policy.constants';
import type { StoredPolicyVersion } from '../types/live-policy-admin.types';

@Injectable()
export class LivePolicyAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  listRecent(take: number): Promise<StoredPolicyVersion[]> {
    return this.prisma.livePolicyVersion.findMany({ orderBy: { version: 'desc' }, take });
  }

  findActive(): Promise<StoredPolicyVersion | null> {
    return this.prisma.livePolicyVersion.findUnique({
      where: { activeKey: LIVE_POLICY_ACTIVE_KEY },
    });
  }

  findVersion(version: number): Promise<StoredPolicyVersion | null> {
    return this.prisma.livePolicyVersion.findUnique({ where: { version } });
  }

  /**
   * Inserts version = max + 1 and moves the active key to it in one transaction: the old holder is
   * cleared first, so the unique `activeKey` never has two owners and a reader never sees none.
   */
  createAndActivate(
    config: unknown,
    note: string | null,
    createdBy: string | null,
  ): Promise<StoredPolicyVersion> {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.livePolicyVersion.aggregate({ _max: { version: true } });
      await tx.livePolicyVersion.updateMany({
        where: { activeKey: LIVE_POLICY_ACTIVE_KEY },
        data: { activeKey: null },
      });
      return tx.livePolicyVersion.create({
        data: {
          version: (latest._max.version ?? 0) + 1,
          activeKey: LIVE_POLICY_ACTIVE_KEY,
          config: config as object,
          note,
          createdBy,
        },
      });
    });
  }
}
