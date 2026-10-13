/** Injection token for the optional Board counters; unbound-safe. */
export const BOARD_COUNTS_PORT = Symbol('BOARD_COUNTS_PORT');

export interface BoardCountsPort {
  /** The visible comment count of the publication changed; recount it. */
  commentsChanged(slug: string): Promise<void>;
  /** The like/dislike totals of the publication changed. */
  reactionsChanged(slug: string, likes: number, dislikes: number): Promise<void>;
}
