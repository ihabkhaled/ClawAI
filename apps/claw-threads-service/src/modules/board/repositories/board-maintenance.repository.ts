import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  BOARD_DID_YOU_MEAN_MAX_WORD_LENGTH,
  BOARD_DID_YOU_MEAN_MIN_WORD_LENGTH,
  BOARD_MAINTENANCE_LOCK_KEY,
} from '../constants/board.constants';
import { VISIBLE_FROM } from '../constants/board-sql.constants';
import type { BoardMaintenanceCounts } from '../types/board.types';
import {
  buildDictionaryDeleteQuery,
  buildDictionaryUpsertQuery,
  buildTrendingRefreshQuery,
} from '../utilities/board-maintenance-sql.utility';

/** Rebuilds the two derived read structures of the Board: the word dictionary and the trending score. */
@Injectable()
export class BoardMaintenanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One pass in one transaction. A transaction-level advisory lock makes replicas take turns: a replica
   * that does not get the lock skips the pass and returns null. Every statement is idempotent.
   */
  refresh(): Promise<BoardMaintenanceCounts | null> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ ok: boolean }[]>(
        Prisma.sql`SELECT pg_try_advisory_xact_lock(${BOARD_MAINTENANCE_LOCK_KEY}::bigint) AS ok`,
      );
      if (locked[0]?.ok !== true) return null;
      const wordsUpserted = await tx.$executeRaw(
        buildDictionaryUpsertQuery(
          VISIBLE_FROM,
          BOARD_DID_YOU_MEAN_MIN_WORD_LENGTH,
          BOARD_DID_YOU_MEAN_MAX_WORD_LENGTH,
        ),
      );
      const wordsRemoved = await tx.$executeRaw(
        buildDictionaryDeleteQuery(
          VISIBLE_FROM,
          BOARD_DID_YOU_MEAN_MIN_WORD_LENGTH,
          BOARD_DID_YOU_MEAN_MAX_WORD_LENGTH,
        ),
      );
      const trendingUpdated = await tx.$executeRaw(buildTrendingRefreshQuery());
      return { wordsUpserted, wordsRemoved, trendingUpdated };
    });
  }
}
