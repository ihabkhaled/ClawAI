import { Injectable } from '@nestjs/common';

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
} from '../utilities/board-sql.utility';

@Injectable()
export class BoardRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(params: BoardListParams): Promise<BoardRow[]> {
    return this.prisma.$queryRaw<BoardRow[]>(buildListQuery(params));
  }

  async count(params: BoardListParams): Promise<number> {
    return firstTotal(await this.prisma.$queryRaw<BoardCountRow[]>(buildCountQuery(params)));
  }

  suggest(q: string, lang: string): Promise<BoardSuggestRow[]> {
    return this.prisma.$queryRaw<BoardSuggestRow[]>(buildSuggestQuery(q, lang));
  }

  async suggestCount(q: string, lang: string): Promise<number> {
    return firstTotal(
      await this.prisma.$queryRaw<BoardCountRow[]>(buildSuggestCountQuery(q, lang)),
    );
  }

  closestWords(tokens: readonly string[], lang: string): Promise<BoardTokenCorrection[]> {
    return this.prisma.$queryRaw<BoardTokenCorrection[]>(buildDidYouMeanQuery(tokens, lang));
  }
}
