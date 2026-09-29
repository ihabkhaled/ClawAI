export type ScoredChunk = {
  /** Which input text the chunk came from. */
  textIndex: number;
  /** Position of the chunk inside that text. */
  chunkIndex: number;
  /** Rarity-weighted overlap with the question; 0 = no shared terms. */
  score: number;
};
