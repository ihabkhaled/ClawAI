import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ADMIN_SIGNAL_LIMIT } from '../constants/abuse-defense.constants';
import type { AbuseSignalCode } from '../enums/abuse-signal-code.enum';
import type { AbuseSignalRow } from '../types/abuse-defense.types';

/** One row per (account, code, minute). Pure data access: what a count means is the service's decision. */
@Injectable()
export class AbuseSignalRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stores the minute's bucket with the window count at that moment. `count` is SET, not added:
   * the Redis window is the running total, this row is a periodic snapshot of it.
   */
  async upsertBucket(input: {
    userId: string;
    code: AbuseSignalCode;
    source: string;
    count: number;
    counted: boolean;
    bucketStart: Date;
  }): Promise<void> {
    const { userId, code, source, count, counted, bucketStart } = input;
    await this.prisma.abuseSignal.upsert({
      where: { userId_code_bucketStart: { userId, code, bucketStart } },
      create: { userId, code, source, count, counted, bucketStart },
      update: { count, source },
    });
  }

  async listRecent(userId: string, limit = ADMIN_SIGNAL_LIMIT): Promise<AbuseSignalRow[]> {
    return this.prisma.abuseSignal.findMany({
      where: { userId },
      orderBy: { bucketStart: 'desc' },
      take: limit,
      select: { code: true, source: true, count: true, counted: true, bucketStart: true },
    });
  }

  /** Every event of one code ever stored for the account (bucket counts added up). */
  async totalFor(userId: string, code: AbuseSignalCode): Promise<number> {
    const result = await this.prisma.abuseSignal.aggregate({
      where: { userId, code },
      _sum: { count: true },
    });
    return result._sum.count ?? 0;
  }
}
