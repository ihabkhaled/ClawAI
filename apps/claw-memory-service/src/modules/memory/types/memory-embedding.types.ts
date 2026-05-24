export type ScopedRetrievalFilter = {
  userId: string;
  threadId?: string;
  workspaceId?: string;
  projectId?: string;
};

export type MemoryEmbeddingSearchResult = {
  memoryId: string;
  score: number;
};
