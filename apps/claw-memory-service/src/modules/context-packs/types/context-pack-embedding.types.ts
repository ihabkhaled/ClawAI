export type ContextPackItemEmbeddingHit = {
  itemId: string;
  contextPackId: string;
  score: number;
};

export type ContextPackRetrievalFilter = {
  userId: string;
  attachedPackIds: string[];
};
