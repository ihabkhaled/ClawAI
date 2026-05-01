export type UpsertWorkspaceObjectEmbeddingInput = {
  workspaceObjectId: string;
  userId: string;
  provider: string;
  objectType: string;
  content: string;
};

export type SearchWorkspaceObjectsInput = {
  userId: string;
  query: string;
  topK?: number;
  providers?: string[];
};

export type SearchHit = {
  workspaceObjectId: string;
  provider: string;
  objectType: string;
  contentSnippet: string;
  score: number;
};

export type SearchResponse = {
  hits: SearchHit[];
  topK: number;
  embeddingModel: string;
};

export type EmbeddingRow = {
  id: string;
  workspaceObjectId: string;
  userId: string;
  provider: string;
  objectType: string;
  contentHash: string;
  contentSnippet: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SearchResultRow = {
  workspaceObjectId: string;
  provider: string;
  objectType: string;
  contentSnippet: string;
  score: number;
};
