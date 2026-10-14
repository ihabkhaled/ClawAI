import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  BoardCountRow,
  BoardListParams,
  BoardRow,
  BoardSuggestRow,
  BoardTokenCorrection,
} from '../types/board.types';
import { firstTotal } from '../utilities/board-row.utility';
import {
  buildCountQuery,
  buildDidYouMeanQuery,
  buildListQuery,
  buildSuggestCountQuery,
  buildSuggestQuery,
  buildThresholdQuery,
} from '../utilities/board-sql.utility';

@Injectable()
export class BoardRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs a searching read in a short transaction that first sets the trigram thresholds locally.
   * The `%` and `<%` operators read those settings, and a pooled connection must never depend on a
   * value another request (or another service) left behind.
   */
  private searching<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(buildThresholdQuery());
      return run(tx);
    });
  }

  list(params: BoardListParams): Promise<BoardRow[]> {
    const query = buildListQuery(params);
    return params.q
      ? this.searching((tx) => tx.$queryRaw<BoardRow[]>(query))
      : this.prisma.$queryRaw<BoardRow[]>(query);
  }

  async count(params: BoardListParams): Promise<number> {
    const query = buildCountQuery(params);
    const rows = params.q
      ? await this.searching((tx) => tx.$queryRaw<BoardCountRow[]>(query))
      : await this.prisma.$queryRaw<BoardCountRow[]>(query);
    return firstTotal(rows);
  }

  suggest(q: string, lang: string): Promise<BoardSuggestRow[]> {
    const query = buildSuggestQuery(q, lang);
    return this.searching((tx) => tx.$queryRaw<BoardSuggestRow[]>(query));
  }

  async suggestCount(q: string, lang: string): Promise<number> {
    const query = buildSuggestCountQuery(q, lang);
    return firstTotal(await this.searching((tx) => tx.$queryRaw<BoardCountRow[]>(query)));
  }

  closestWords(tokens: readonly string[], lang: string): Promise<BoardTokenCorrection[]> {
    const query = buildDidYouMeanQuery(tokens, lang);
    return this.searching((tx) => tx.$queryRaw<BoardTokenCorrection[]>(query));
  }
}
