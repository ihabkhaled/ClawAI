import type { ThreadListNavigateMode } from '@/enums/thread-list-navigate-mode.enum';
import type { ThreadListStatus } from '@/enums/thread-list-status.enum';
import type {
  ThreadDeleteController,
  ThreadErrorMessage,
} from '@/types/thread-generation-progress.types';

/** Why a Thread failed, as `GET /thread-publications/mine/page` reports it. */
export type ThreadListFailure = {
  code: string;
  retryable: boolean;
  step: string | null;
};

/** One row of the owner's Threads list. */
export type ThreadListItem = {
  id: string;
  title: string | null;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
  status: Exclude<ThreadListStatus, ThreadListStatus.ALL>;
  publishedAt: string | null;
  failure: ThreadListFailure | null;
  canPublish: boolean;
  canDelete: boolean;
};

export type ThreadListPage = {
  items: ThreadListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** The URL is the state: `?q=&status=&page=`. */
export type ThreadListUrlState = {
  q: string;
  status: ThreadListStatus;
  page: number;
};

export type ThreadListNavigate = (next: ThreadListUrlState, mode: ThreadListNavigateMode) => void;

export type ThreadListQuery = ThreadListUrlState & { pageSize: number };

/** A reason is either a list string (`listKey`) or a shared dictionary key (`messageKey`), never both. */
export type ThreadListFailureView = {
  listKey: keyof ThreadListLocaleTranslation | null;
  messageKey: string | null;
  params: Record<string, string>;
  retryable: boolean;
};

/** Flat strings under `threadList...`, one set per locale. */
export type ThreadListLocaleTranslation = {
  threadListRegionLabel: string;
  threadListSearchLabel: string;
  threadListSearchPlaceholder: string;
  threadListSearchClear: string;
  threadListStatusLabel: string;
  threadListStatusAll: string;
  threadListStatusGenerating: string;
  threadListStatusReady: string;
  threadListStatusPublished: string;
  threadListStatusFailed: string;
  threadListCreatedOn: string;
  threadListPublish: string;
  threadListPublishAria: string;
  threadListPublishedChip: string;
  threadListViewPublic: string;
  threadListGenerating: string;
  threadListReady: string;
  threadListFailedLabel: string;
  threadListReasonCancelled: string;
  threadListReasonRevoked: string;
  threadListReasonMissing: string;
  threadListReasonGeneric: string;
  threadListRetryable: string;
  threadListDelete: string;
  threadListDeleteAria: string;
  threadListNoResults: string;
  threadListNoStatusResults: string;
  threadListClearFilters: string;
  threadListLoadFailed: string;
  threadListRetry: string;
  threadListLoading: string;
};

export type ThreadListTranslate = (
  key: keyof ThreadListLocaleTranslation,
  params?: Record<string, string | number>,
) => string;

export type ThreadListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  status: ThreadListStatus;
  onStatusChange: (status: ThreadListStatus) => void;
};

export type ThreadListRowProps = {
  item: ThreadListItem;
  onPublish: (item: ThreadListItem) => void;
  isPublishing: boolean;
  publishError: ThreadErrorMessage | null;
  onDelete: (item: ThreadListItem) => void;
};

export type ThreadListRowStatusProps = {
  item: ThreadListItem;
};

export type ThreadListEmptyProps = {
  query: string;
  status: ThreadListStatus;
  onClear: () => void;
};

export type ThreadListErrorProps = { onRetry: () => void };

export type ThreadListController = {
  state: ThreadListUrlState;
  search: string;
  setSearch: (value: string) => void;
  clearSearch: () => void;
  setStatus: (status: ThreadListStatus) => void;
  setPage: (page: number) => void;
  clearFilters: () => void;
  data: ThreadListPage | undefined;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
  publishingId: string | null;
  publishError: { id: string; message: ThreadErrorMessage } | null;
  publish: (item: ThreadListItem) => void;
  remove: ThreadDeleteController;
  askDelete: (item: ThreadListItem) => void;
};
