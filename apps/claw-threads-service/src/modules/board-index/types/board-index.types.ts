export interface BoardIndexSource {
  publicationId: string;
  slug: string;
  contentLocale: string;
  publicationType: string;
  publishedAt: Date;
  viewCount: number;
  title: string;
  markdown: string;
  sourceCount: number;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
}

export interface BoardIndexDoc {
  publicationId: string;
  slug: string;
  contentLocale: string;
  publicationType: string;
  publishedAt: Date;
  title: string;
  excerpt: string;
  titleNorm: string;
  bodyNorm: string;
  readingMinutes: number;
  sourceCount: number;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  viewCount: number;
  textSearchConfig: string;
  formatVersion: number;
}

export interface BoardReconcileCursor {
  updatedAt: Date;
  id: string;
}

export interface BoardChangedPublication {
  id: string;
  updatedAt: Date;
}

export interface BoardIndexStore {
  loadVisibleSource(publicationId: string): Promise<BoardIndexSource | null>;
  upsertDoc(doc: BoardIndexDoc): Promise<void>;
  deleteDoc(publicationId: string): Promise<boolean>;
  findChangedSince(cursor: BoardReconcileCursor, limit: number): Promise<BoardChangedPublication[]>;
  /** Of the `scanLimit` oldest rows idle since `before`, the ids whose counters drifted; the rest are touched. */
  findStaleDocIds(before: Date, scanLimit: number): Promise<string[]>;
  findInvisibleDocIds(limit: number): Promise<string[]>;
  findOutdatedDocIds(version: number, limit: number): Promise<string[]>;
}

export interface BoardIndexSyncer {
  syncPublication(publicationId: string): Promise<boolean>;
  removePublication(publicationId: string): Promise<void>;
}

export interface BoardReconcileResult {
  upserted: number;
  removed: number;
}

export type BoardTextSpan = readonly [number, number];
export type BoardHighlightRange = [number, number];

export interface BoardTitleToken {
  text: string;
  start: number;
  end: number;
}
