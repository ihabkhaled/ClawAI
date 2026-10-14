import { Injectable } from '@nestjs/common';

import { highlightRanges } from '../../board-index/utilities/board-match-ranges.utility';
import { normalizeSearchText } from '../../board-index/utilities/board-search-normalizer.utility';
import {
  BOARD_DID_YOU_MEAN_BELOW,
  BOARD_DID_YOU_MEAN_MAX_TOKENS,
  BOARD_MAX_PAGE,
  BOARD_SUGGEST_MIN_LENGTH,
  BOARD_SUGGEST_TOTAL_CAP,
} from '../constants/board.constants';
import type { BoardListQuery, BoardSuggestQuery } from '../dto/board-query.dto';
import { BoardRepository } from '../repositories/board.repository';
import type { BoardListResult, BoardSuggestResult } from '../types/board.types';
import { toItem } from '../utilities/board-row.utility';
import { applyCorrections, charCount, tokenise } from '../utilities/board-text.utility';

@Injectable()
export class BoardService {
  constructor(private readonly repository: BoardRepository) {}

  async list(userId: string, query: BoardListQuery): Promise<BoardListResult> {
    const q = normalizeSearchText(query.q ?? '');
    const params = {
      q,
      lang: query.lang,
      type: query.type,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
      userId,
    };
    // A page deeper than the cap is an empty page with real meta, never an error or a deep OFFSET scan.
    const [rows, total] = await Promise.all([
      query.page > BOARD_MAX_PAGE ? Promise.resolve([]) : this.repository.list(params),
      this.repository.count(params),
    ]);
    const didYouMean =
      q && total < BOARD_DID_YOU_MEAN_BELOW ? await this.didYouMean(q, query.lang) : null;
    return {
      items: rows.map(toItem),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
      didYouMean,
    };
  }

  async suggest(query: BoardSuggestQuery): Promise<BoardSuggestResult> {
    const q = normalizeSearchText(query.q);
    if (charCount(q) < BOARD_SUGGEST_MIN_LENGTH) {
      return { suggestions: [], didYouMean: null, total: 0, totalCapped: false };
    }
    const [rows, count] = await Promise.all([
      this.repository.suggest(q, query.lang),
      this.repository.suggestCount(q, query.lang),
    ]);
    const didYouMean =
      count < BOARD_DID_YOU_MEAN_BELOW ? await this.didYouMean(q, query.lang) : null;
    return {
      suggestions: rows.map((row) => ({
        slug: row.slug,
        title: row.title,
        publicationType: row.publicationType,
        contentLocale: row.contentLocale,
        publishedAt: new Date(row.publishedAt).toISOString(),
        match: highlightRanges(row.title, q),
      })),
      didYouMean,
      total: Math.min(count, BOARD_SUGGEST_TOTAL_CAP),
      totalCapped: count > BOARD_SUGGEST_TOTAL_CAP,
    };
  }

  private async didYouMean(q: string, lang: string): Promise<string | null> {
    const tokens = tokenise(q).slice(0, BOARD_DID_YOU_MEAN_MAX_TOKENS);
    if (tokens.length === 0) return null;
    const corrections = await this.repository.closestWords(tokens, lang);
    return applyCorrections(tokens, corrections);
  }
}
