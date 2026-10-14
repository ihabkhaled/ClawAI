import type { PublicAuthor } from '../../author-identity/types/author-identity.types';
import type { BOARD_SORTS } from '../constants/board.constants';

export type BoardSort = (typeof BOARD_SORTS)[number];
export type BoardReaction = 'LIKE' | 'DISLIKE';

export interface BoardFilters {
  /** Normalised search text, empty when there is no query. */
  readonly q: string;
  readonly lang: string;
  readonly type: string;
}

export interface BoardListParams extends BoardFilters {
  readonly sort: BoardSort;
  readonly page: number;
  readonly limit: number;
  /** Null for an anonymous visitor: no reaction join, `viewerReaction` is always null. */
  readonly userId: string | null;
}

export interface BoardRow {
  readonly slug: string;
  /** Id of the publisher; named by auth-service in `BoardService` and never sent to the client. */
  readonly ownerId: string | null;
  readonly title: string;
  readonly excerpt: string;
  readonly contentLocale: string;
  readonly publicationType: string;
  readonly publishedAt: Date;
  readonly readingMinutes: number;
  readonly sourceCount: number;
  readonly likeCount: number;
  readonly commentCount: number;
  readonly viewCount: number;
  readonly viewerReaction: BoardReaction | null;
}

export interface BoardItem {
  readonly slug: string;
  /** The publisher's name; null when the account is gone or the name could not be read. */
  readonly owner: PublicAuthor | null;
  readonly title: string;
  readonly excerpt: string;
  readonly contentLocale: string;
  readonly publicationType: string;
  readonly publishedAt: string;
  readonly readingMinutes: number;
  readonly sourceCount: number;
  readonly likeCount: number;
  readonly commentCount: number;
  readonly viewCount: number;
  readonly viewerReaction: BoardReaction | null;
}

export interface BoardListResult {
  readonly items: BoardItem[];
  readonly meta: { total: number; page: number; limit: number; totalPages: number };
  readonly didYouMean: string | null;
}

export interface BoardSuggestRow {
  readonly slug: string;
  readonly title: string;
  readonly publicationType: string;
  readonly contentLocale: string;
  readonly publishedAt: Date;
}

export interface BoardSuggestion {
  readonly slug: string;
  readonly title: string;
  readonly publicationType: string;
  readonly contentLocale: string;
  readonly publishedAt: string;
  /** Highlight ranges [start, end) in UTF-16 units of the original title. */
  readonly match: [number, number][];
}

export interface BoardSuggestResult {
  readonly suggestions: BoardSuggestion[];
  readonly didYouMean: string | null;
  readonly total: number;
  readonly totalCapped: boolean;
}

export interface BoardTokenCorrection {
  readonly token: string;
  readonly word: string;
}

export interface BoardCountRow {
  total: number;
}

/** `list` may look inside a short title; `suggest` (every keystroke) uses prefix and full-text only. */
export type BoardMatchMode = 'list' | 'suggest';

export interface BoardMaintenanceCounts {
  readonly wordsUpserted: number;
  readonly wordsRemoved: number;
  readonly trendingUpdated: number;
}
