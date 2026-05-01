import type { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

export type InboxFilter = {
  userId: string;
  providers?: WorkspaceProvider[];
  types?: WorkspaceObjectType[];
  needsAttention?: boolean;
  hasSuggestion?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  cursor?: string;
  limit: number;
};

export type InboxItem = {
  id: string;
  externalId: string;
  type: string;
  title: string;
  contentSnippet: string | null;
  url: string | null;
  provider: string;
  authorId: string | null;
  externalUpdatedAt: Date | null;
  hasSuggestion: boolean;
  needsAttention: boolean;
};

export type InboxPage = {
  items: InboxItem[];
  nextCursor: string | null;
  totalCount: number;
};

export type SearchInput = {
  userId: string;
  query: string;
  topK?: number;
  providers?: WorkspaceProvider[];
};

export type SearchResultItem = {
  workspaceObjectId: string;
  provider: string;
  objectType: string;
  contentSnippet: string;
  score: number;
  // Hydrated fields populated after the embedding hit (best-effort).
  title?: string | null;
  url?: string | null;
  authorId?: string | null;
};

export type SearchResponse = {
  hits: SearchResultItem[];
  topK: number;
  embeddingModel: string;
};
