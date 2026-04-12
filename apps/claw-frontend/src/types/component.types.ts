import type { LucideIcon } from 'lucide-react';

import type { SidebarItem } from '@/constants';
import type { ComponentSize, ConnectorStatus, MessageFeedback, RoutingMode } from '@/enums';
import type { ResolvedTheme, Theme } from '@/enums/theme.enum';
import type { TranslateFunction } from '@/types/i18n.types';

import type { AdminUser, AuditLog } from './audit.types';
import type { DownloadStats, ModelCatalogEntry, PullJobResponse } from './catalog.types';
import type { ReplayBatchResult, ReplayResult } from './replay.types';
import type { ChatMessage, ChatThread, FallbackAttemptInfo } from './chat.types';
import type { Connector, ConnectorModel, CreateConnectorRequest } from './connector.types';
import type { CreateContextPackItemRequest, CreateContextPackRequest } from './context-pack.types';
import type { UploadedFile } from './file.types';
import type { AggregatedHealth } from './health.types';
import type {
  ClientLogEntry,
  ClientLogStats,
  ClientLogsTabProps,
  ServerLogEntry,
  ServerLogStats,
  ServerLogsTabProps,
} from './log.types';
import type { CreateMemoryRequest, MemoryRecord } from './memory.types';
import type { CreatePolicyRequest, RoutingDecision, RoutingPolicy } from './routing.types';

// ─── Common component props ──────────────────────────────────────────────────

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
};

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export type LoadingSpinnerProps = {
  className?: string;
  size?: ComponentSize;
  label?: string;
};

export type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export type StatusBadgeProps = {
  status: ConnectorStatus | string;
  className?: string;
};

// ─── Layout component props ──────────────────────────────────────────────────

export type SidebarNavItemProps = {
  item: SidebarItem;
};

// ─── Memory component props ─────────────────────────────────────────────────

export type MemoryCardProps = {
  memory: MemoryRecord;
  onToggle: (id: string) => void;
  onEdit: (memory: MemoryRecord) => void;
  onDelete: (id: string) => void;
  isTogglePending: boolean;
};

// ─── File component props ───────────────────────────────────────────────────

export type FileUploadZoneProps = {
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  validationError: string | null;
};

export type FileListItemProps = {
  file: UploadedFile;
  onDelete: (id: string) => void;
  onViewChunks: (id: string) => void;
  isDeletePending: boolean;
};

// ─── Form validation types ──────────────────────────────────────────────────

export type FormFieldErrors = Record<string, string[] | undefined>;

// ─── Page-specific types ─────────────────────────────────────────────────────

export type ProvidersProps = {
  children: React.ReactNode;
};

export type ThemeProviderProps = {
  children: React.ReactNode;
};

export type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

export type UseAppThemeReturn = {
  theme: Theme;
  resolvedTheme: ResolvedTheme | undefined;
  setTheme: (theme: Theme) => void;
};

export type UseThemeSwitcherReturn = {
  theme: Theme;
  handleCycleTheme: () => void;
  isPending: boolean;
};

export type ThreadSettingsProps = {
  t: TranslateFunction;
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
  maxTokens: string;
  onMaxTokensChange: (value: string) => void;
  selectedModel: ModelSelection | null;
  onModelChange: (selection: ModelSelection | null) => void;
  contextPackIds: string[];
  onContextPackIdsChange: (ids: string[]) => void;
  onSave: () => void;
  isPending: boolean;
};

export type GroupedModels = {
  provider: string;
  label: string;
  models: ModelSelection[];
};

// ─── Admin component props ──────────────────────────────────────────────────

export type UserTableProps = {
  users: AdminUser[];
  onChangeRole: (userId: string, role: string) => void;
  onDeactivate: (userId: string) => void;
  isRoleChangePending: boolean;
  isDeactivatePending: boolean;
};

// ─── Chat component props ───────────────────────────────────────────────────

export type MessageBubbleProps = {
  message: ChatMessage;
  routingDecision?: RoutingDecision | null;
  onFeedback?: (messageId: string, feedback: MessageFeedback | null) => void;
  onRegenerate?: (messageId: string) => void;
};

export type ThinkingIndicatorProps = {
  className?: string;
  fallbackAttempts?: FallbackAttemptInfo[];
  streamError?: string | null;
};

export type ModelSelection = {
  provider: string;
  model: string;
  displayName: string;
};

export type ModelSelectorProps = {
  value: ModelSelection | null;
  onChange: (selection: ModelSelection | null) => void;
  disabled?: boolean;
};

export type FileAttachmentPickerProps = {
  selectedFileIds: string[];
  onChange: (fileIds: string[]) => void;
  disabled?: boolean;
};

export type ContextPackSelectorProps = {
  t: TranslateFunction;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export type MessageComposerProps = {
  onSend: (content: string, modelSelection?: ModelSelection, fileIds?: string[]) => void;
  isPending: boolean;
  threadModel?: ModelSelection | null;
};

export type RoutingBadgeProps = {
  mode: RoutingMode;
  className?: string;
};

export type RoutingTransparencyProps = {
  decision: RoutingDecision;
};

export type ThreadListItemProps = {
  thread: ChatThread;
  isActive?: boolean;
  onPin?: (id: string, isPinned: boolean) => void;
  onArchive?: (id: string, isArchived: boolean) => void;
  isPinPending?: boolean;
  isArchivePending?: boolean;
};

export type GlobalSearchProps = {
  className?: string;
};

export type MessageProvenanceProps = {
  message: ChatMessage;
};

export type ImageLoadingStateProps = {
  status: string;
  prompt: string;
  provider?: string;
  model?: string;
};

export type ImageErrorStateProps = {
  status: string;
  error?: string | null;
  provider?: string;
  model?: string;
  onRetry: () => void;
  showModelPicker?: boolean;
  onRetryWithModel?: (provider: string, model: string) => void;
};

export type ImageCompletedStateProps = {
  blobUrl: string;
  prompt: string;
};

export type FileLoadingStateProps = {
  status: string;
  prompt: string;
  format?: string;
};

export type FileErrorStateProps = {
  status: string;
  error?: string | null;
  onRetry: () => void;
};

export type FileCompletedStateProps = {
  blobUrl: string;
  filename: string;
  format: string;
  sizeBytes: number | null;
};

export type AttachmentThumbnailProps = {
  fileId: string;
};

export type MessagesContentProps = {
  isLoadingThread: boolean;
  isLoadingMessages: boolean;
  messages: ChatMessage[];
  isWaitingForResponse: boolean;
  fallbackAttempts: FallbackAttemptInfo[];
  streamError: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onFeedback: (messageId: string, feedback: MessageFeedback | null) => void;
  onRegenerate: (messageId: string) => void;
};

export type VirtualizedMessagesProps = {
  messages: ChatMessage[];
  isLoading: boolean;
  isFetchingPreviousPage: boolean;
  hasPreviousPage: boolean;
  isWaitingForResponse: boolean;
  fallbackAttempts: FallbackAttemptInfo[];
  streamError: string | null;
  onStartReached: () => void;
  onFeedback: (messageId: string, feedback: MessageFeedback | null) => void;
  onRegenerate: (messageId: string) => void;
};

export type VirtualizedThreadListProps = {
  threads: ChatThread[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onEndReached: () => void;
  onPin: (id: string, isPinned: boolean) => void;
  onArchive: (id: string, isArchived: boolean) => void;
  isPinPending: boolean;
  isArchivePending: boolean;
  search: string;
};

export type ChatPageReturn = {
  pinnedThreads: ChatThread[];
  unpinnedThreads: ChatThread[];
  allThreads: ChatThread[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  search: string;
  setSearch: (value: string) => void;
  showArchived: boolean;
  toggleShowArchived: () => void;
  handleNewChat: () => void;
  isCreating: boolean;
  handlePin: (id: string, isPinned: boolean) => void;
  handleArchive: (id: string, isArchived: boolean) => void;
  isPinPending: boolean;
  isArchivePending: boolean;
};

// ─── Common component props (generic) ───────────────────────────────────────

export type VirtualizedListProps<T> = {
  data: T[];
  itemContent: (index: number, item: T) => React.ReactElement;
  className?: string;
  style?: React.CSSProperties;
  overscan?: number;
};

// ─── Connector component props ──────────────────────────────────────────────

export type ConnectorCardProps = {
  connector: Connector;
  onTest: (id: string) => void;
  onSync: (id: string) => void;
  onEdit: (connector: Connector) => void;
  onDelete: (id: string) => void;
  isTestPending: boolean;
  isSyncPending: boolean;
};

export type ConnectorFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateConnectorRequest) => void;
  isPending: boolean;
  connector?: Connector | null;
};

export type ModelTableProps = {
  models: ConnectorModel[];
  showProvider?: boolean;
  emptyMessage?: string;
};

// ─── Context pack component props ───────────────────────────────────────────

export type ContextPackFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateContextPackRequest) => void;
  isPending: boolean;
};

export type ContextPackItemFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateContextPackItemRequest) => void;
  isPending: boolean;
};

// ─── File component props (extended) ────────────────────────────────────────

export type FileChunksDialogProps = {
  fileId: string | null;
  onClose: () => void;
};

// ─── Memory component props (extended) ──────────────────────────────────────

export type MemoryFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateMemoryRequest) => void;
  isPending: boolean;
  memory?: MemoryRecord | null;
};

// ─── Observability component props ──────────────────────────────────────────

export type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
};

export type UsageBarItem = {
  label: string;
  value: number;
  secondaryValue?: number;
};

export type UsageChartProps = {
  title: string;
  items: UsageBarItem[];
  valueLabel?: string;
  secondaryLabel?: string;
};

// ─── Routing component props ────────────────────────────────────────────────

export type PolicyFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePolicyRequest) => void;
  isPending: boolean;
  policy?: RoutingPolicy | null;
};

// ─── Admin sub-component props ─────────────────────────────────────────────

export type AccessDeniedProps = {
  t: TranslateFunction;
};

export type HealthCardContentProps = {
  isLoading: boolean;
  isError: boolean;
  health: AggregatedHealth | null;
  t: TranslateFunction;
};

export type UsersContentProps = {
  isLoading: boolean;
  isError: boolean;
  users: AdminUser[];
  onChangeRole: (userId: string, role: string) => void;
  onDeactivate: (userId: string) => void;
  isRoleChangePending: boolean;
  isDeactivatePending: boolean;
  t: TranslateFunction;
};

// ─── Audit sub-component props ─────────────────────────────────────────────

export type AuditContentProps = {
  isLoading: boolean;
  isError: boolean;
  auditLogs: AuditLog[];
  meta: { page: number; totalPages: number; total: number };
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  t: TranslateFunction;
};

// ─── Layout sub-component props ────────────────────────────────────────────

export type SearchResultsProps = {
  isLoading: boolean;
  threads: ChatThread[];
  onSelect: (id: string) => void;
};

// ─── Log sub-component props ───────────────────────────────────────────────

export type AuditDetailRowProps = {
  row: AuditLog;
};

export type AuditLogsContentProps = {
  auditLogs: AuditLog[];
  meta: { page: number; totalPages: number; total: number };
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  isLoading: boolean;
  isError: boolean;
};

export type ClientLogEntryRowProps = {
  entry: ClientLogEntry;
};

export type ClientLogsContentProps = {
  logs: ClientLogEntry[];
  meta: ClientLogsTabProps['meta'];
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  isError: boolean;
};

export type ServerLogEntryRowProps = {
  entry: ServerLogEntry;
};

export type ServerLogsContentProps = {
  logs: ServerLogEntry[];
  meta: ServerLogsTabProps['meta'];
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  isError: boolean;
};

export type ServerLogsStatsProps = {
  stats: ServerLogStats;
};

export type ClientLogsStatsProps = {
  stats: ClientLogStats;
};

// ─── Catalog component props ──────────────────────────────────────────────

export type CatalogModelCardProps = {
  entry: ModelCatalogEntry;
  job: PullJobResponse | undefined;
  onPull: (catalogId: string) => void;
  onDelete: (modelId: string) => void;
  isPullPending: boolean;
  isDeletePending: boolean;
  t: TranslateFunction;
};

export type CatalogCategoryFilterProps = {
  selectedCategory: string | undefined;
  onSelect: (category: string | undefined) => void;
  t: TranslateFunction;
};

export type DownloadProgressBarProps = {
  job: PullJobResponse;
  stats: DownloadStats | undefined;
  onCancel: (jobId: string) => void;
  isCancelPending: boolean;
  t: TranslateFunction;
};

export type ActiveDownloadsPanelProps = {
  jobs: PullJobResponse[];
  downloadStatsMap: Map<string, DownloadStats>;
  onCancel: (jobId: string) => void;
  isCancelPending: boolean;
  t: TranslateFunction;
};

// ─── Replay component props ───────────────────────────────────────────────

export type ReplaySummaryCardProps = {
  result: ReplayBatchResult;
  t: TranslateFunction;
};

export type ReplayResultRowProps = {
  result: ReplayResult;
  index: number;
  t: TranslateFunction;
};

export type ReplayFiltersFormProps = {
  routingMode: string | undefined;
  onRoutingModeChange: (value: string | undefined) => void;
  limit: number;
  onLimitChange: (value: number) => void;
  onSubmit: () => void;
  isPending: boolean;
  t: TranslateFunction;
};
