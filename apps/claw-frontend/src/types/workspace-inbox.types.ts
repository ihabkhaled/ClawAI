import type { WorkspaceObjectType } from '../enums/workspace-object-type.enum';
import type { WorkspaceProvider } from '../enums/workspace-provider.enum';

import type { UseFileViewerResult } from './file-viewer.types';
import type { TranslateFunction } from './i18n.types';

export type InboxItem = {
  id: string;
  externalId: string;
  type: string;
  title: string;
  contentSnippet: string | null;
  url: string | null;
  provider: string;
  authorId: string | null;
  externalUpdatedAt: string | null;
  hasSuggestion: boolean;
  needsAttention: boolean;
};

export type InboxPage = {
  items: InboxItem[];
  nextCursor: string | null;
  totalCount: number;
};

export type InboxFilterState = {
  providers: WorkspaceProvider[];
  types: WorkspaceObjectType[];
  needsAttention: boolean;
  hasSuggestion: boolean;
};

export type SearchHit = {
  workspaceObjectId: string;
  provider: string;
  objectType: string;
  contentSnippet: string;
  score: number;
  title: string | null;
  url: string | null;
  authorId: string | null;
};

export type SearchResponse = {
  hits: SearchHit[];
  topK: number;
  embeddingModel: string;
};

export type InboxPageRenderProps = {
  items: InboxItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  filter: InboxFilterState;
  onFilterChange: (next: InboxFilterState) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  toggleNeedsAttention: (id: string, next: boolean) => void;
  isUpdating: boolean;
  t: TranslateFunction;
};

export type SearchPageRenderProps = {
  query: string;
  setQuery: (next: string) => void;
  hits: SearchHit[];
  isSearching: boolean;
  isError: boolean;
  error: Error | null;
  onSubmit: () => void;
  embeddingModel: string | null;
  t: TranslateFunction;
};

export type InboxRowProps = {
  item: InboxItem;
  onToggleNeedsAttention: (id: string, next: boolean) => void;
  // v3 round 11 — open the file viewer for FILE/DOCUMENT-type items.
  onViewFile: (objectId: string, title: string) => void;
  isUpdating: boolean;
  t: TranslateFunction;
};

export type SearchResultCardProps = {
  hit: SearchHit;
};

export type UseWorkspaceSearchResult = {
  query: string;
  setQuery: (next: string) => void;
  hits: SearchHit[];
  isSearching: boolean;
  isError: boolean;
  error: Error | null;
  embeddingModel: string | null;
  submit: () => void;
  reset: () => void;
};

export type InboxFilterBarProps = {
  filter: InboxFilterState;
  onChange: (next: InboxFilterState) => void;
  t: TranslateFunction;
};

export type UseInboxPageResult = {
  items: InboxItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  filter: InboxFilterState;
  setFilter: (next: InboxFilterState) => void;
  hasMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
  toggleNeedsAttention: (id: string, next: boolean) => void;
  isUpdating: boolean;
  // v3 round 11 — composed file-viewer sub-controller (Prompt 08).
  fileViewer: UseFileViewerResult;
};
