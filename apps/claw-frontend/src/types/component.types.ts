import type { LucideIcon } from 'lucide-react';

import type { SidebarItem } from '@/constants';
import type {
  ComponentSize,
  ConnectorStatus,
  CostTier,
  MessageFeedback,
  RepairType,
  ReplayOutcomeLabel,
  RoutingMode,
} from '@/enums';
import type { AiActionKind } from '@/enums/ai-action-kind.enum';
import type { ConsensusConfidenceLevel } from '@/enums/consensus-confidence-level.enum';
import type { ResearchProviderKind } from '@/enums/research-provider-kind.enum';
import type { ResolvedTheme, Theme } from '@/enums/theme.enum';
import type { WorkspaceConnectorStatus } from '@/enums/workspace-connector-status.enum';
import type { TranslateFunction } from '@/types/i18n.types';
import type {
  ResearchEvidenceBundle,
  ResearchOptions,
  SanitizedResearchProvider,
} from '@/types/research.types';

import type {
  AdaptiveLearningInsights,
  ModeInsight,
  ProviderInsight,
} from './adaptive-learning.types';
import type { RepairResultState } from './answer-repair.types';
import type { AdminUser, AuditLog } from './audit.types';
import type { BestOfNResultState, CandidateResult } from './best-of-n.types';
import type { DownloadStats, ModelCatalogEntry, PullJobResponse } from './catalog.types';
import type {
  ChatMessage,
  ChatThread,
  FallbackAttemptInfo,
  JudgeModelOption,
  VisibleProgressStage,
} from './chat.types';
import type { ConfluencePageMetadata } from './confluence.types';
import type { Connector, ConnectorModel, CreateConnectorRequest } from './connector.types';
import type { ConsensusMetadata, ConsensusModelBreakdown } from './consensus.types';
import type { CreateContextPackItemRequest, CreateContextPackRequest } from './context-pack.types';
import type { CostEnsembleResult } from './cost-ensemble.types';
import type { DocFileMetadata } from './docs.types';
import type {
  EscalationChainStep,
  EscalationChainSynthesisState,
  EscalationStepResult,
} from './escalation-chain.types';
import type { FigmaDesignMetadata } from './figma.types';
import type { UploadedFile } from './file.types';
import type { GmailMessageMetadata } from './gmail.types';
import type { AggregatedHealth } from './health.types';
import type { JiraTicketMetadata } from './jira.types';
import type {
  ClientLogEntry,
  ClientLogsTabProps,
  ClientLogStats,
  ServerLogEntry,
  ServerLogsTabProps,
  ServerLogStats,
} from './log.types';
import type {
  ApproveSuggestionRequest,
  CreateMemoryRequest,
  MemoryAuditLog,
  MemoryRecord,
  MemorySuggestion,
  RejectSuggestionRequest,
} from './memory.types';
import type {
  ParallelModelResponse,
  ParallelModelTarget,
  ParallelResponse,
} from './parallel.types';
import type { PipelineResult, PipelineStageResult } from './pipeline.types';
import type { ProviderFailureStat, RecentFallback } from './recovery.types';
import type { ReplayCaseDetail, ReplayRunSummary, RunComparisonResult } from './replay-run.types';
import type { ReplayBatchResult, ReplayResult } from './replay.types';
import type { RoleMemberResult, RolePackResult } from './role-pack.types';
import type { CreatePolicyRequest, RoutingDecision, RoutingPolicy } from './routing.types';
import type { SlackMessageMetadata } from './slack.types';
import type { PullRequestMetadata } from './source-control.types';
import type { DecompositionResultState, SubTaskResult } from './task-decomposition.types';
import type { UseVerifyResultState } from './verifier.types';
import type {
  WorkspaceAction,
  WorkspaceConnector,
  WorkspaceHealthEvent,
  WorkspaceObject,
  WorkspaceSearchResult,
  WorkspaceSyncRun,
} from './workspace.types';

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
  judgeEnabled: boolean;
  onJudgeEnabledChange: (value: boolean) => void;
  judgeModel: string | null;
  onJudgeModelChange: (value: string | null) => void;
  judgeModelOptions: JudgeModelOption[];
  qualityThreshold: number;
  onQualityThresholdChange: (value: number) => void;
  maxReRouteAttempts: number;
  onMaxReRouteAttemptsChange: (value: number) => void;
  onSave: () => void;
  isPending: boolean;
};

export type JudgeRefereeDetailsProps = {
  message: ChatMessage;
};

export type ResearchRunDetailsProps = {
  message: ChatMessage;
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
  judgeEvaluating?: boolean;
  executingModel?: string | null;
  judgeModel?: string | null;
  progressStages?: VisibleProgressStage[];
  currentStageLabel?: string | null;
};

export type ModelSelection = {
  provider: string;
  model: string;
  displayName: string;
  specifications?: string[];
};

export type ModelSelectorProps = {
  value: ModelSelection | null;
  onChange: (selection: ModelSelection | null) => void;
  disabled?: boolean;
};

export type AdvancedModuleModelSelectorProps = {
  t: TranslateFunction;
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
  onSend: (
    content: string,
    modelSelection?: ModelSelection,
    fileIds?: string[],
    research?: ResearchOptions,
  ) => void;
  isPending: boolean;
  selectedModel: ModelSelection | null;
  onModelChange: (model: ModelSelection | null) => void;
};

export type ResearchToggleProps = {
  value: ResearchOptions;
  providers: SanitizedResearchProvider[];
  isProvidersLoading?: boolean;
  onChange: (value: ResearchOptions) => void;
  disabled?: boolean;
};

export type EvidenceViewerProps = {
  bundle: ResearchEvidenceBundle | null;
  t: TranslateFunction;
};

export type ResearchProviderRowProps = {
  provider: SanitizedResearchProvider;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
  isTestPending: boolean;
  isDeletePending: boolean;
};

export type ResearchProviderFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ResearchProviderFormStateValue;
  onSetField: <K extends keyof ResearchProviderFormStateValue>(
    key: K,
    value: ResearchProviderFormStateValue[K],
  ) => void;
  onSubmit: () => void;
  isPending: boolean;
  error: string | null;
};

type ResearchProviderFormStateValue = {
  kind: ResearchProviderKind;
  name: string;
  baseUrl: string;
  apiKey: string;
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
  progressStages: VisibleProgressStage[];
  currentStageLabel: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onFeedback: (messageId: string, feedback: MessageFeedback | null) => void;
  onRegenerate: (messageId: string) => void;
};

export type VirtualizedMessagesProps = {
  messages: ChatMessage[];
  isLoading: boolean;
  isFetchingPreviousPage: boolean;
  hasPreviousPage: boolean;
  firstItemIndex: number;
  isWaitingForResponse: boolean;
  fallbackAttempts: FallbackAttemptInfo[];
  streamError: string | null;
  judgeEvaluating?: boolean;
  executingModel?: string | null;
  judgeModel?: string | null;
  progressStages: VisibleProgressStage[];
  currentStageLabel: string | null;
  t: TranslateFunction;
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

// === Memory V2 ===
export type SuggestionsListProps = {
  suggestions: MemorySuggestion[];
  isLoading: boolean;
  isPending: boolean;
  onApprove: (id: string, data?: ApproveSuggestionRequest) => void;
  onReject: (id: string, data?: RejectSuggestionRequest) => void;
};

export type AuditListProps = {
  entries: MemoryAuditLog[];
  isLoading: boolean;
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

export type CatalogCapabilityFilterProps = {
  selectedCapability: string | undefined;
  onSelect: (capability: string | undefined) => void;
  t: TranslateFunction;
};

export type SearchBrowserScoreBadgeProps = {
  score: number | null;
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
  threadId: string;
  onThreadIdChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  limit: number;
  onLimitChange: (value: number) => void;
  saveRun: boolean;
  onSaveRunChange: (value: boolean) => void;
  runName: string;
  onRunNameChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  t: TranslateFunction;
};

export type ReplayOutcomeBadgeProps = {
  outcomeLabel: ReplayOutcomeLabel;
  t: TranslateFunction;
};

export type ReplayNeedsReviewListProps = {
  cases: ReplayCaseDetail[];
  onReview: (caseId: string, isConfirmedRegression: boolean, notes: string) => void;
  isReviewPending: boolean;
  onPromote: (caseId: string) => void;
  isPromotePending: boolean;
  t: TranslateFunction;
};

export type ReplayRunHistoryProps = {
  runs: ReplayRunSummary[];
  isLoading: boolean;
  compareRunId1: string | null;
  compareRunId2: string | null;
  onCompareRunId1Change: (id: string | null) => void;
  onCompareRunId2Change: (id: string | null) => void;
  compareResult: RunComparisonResult | undefined;
  isCompareLoading: boolean;
  t: TranslateFunction;
};

export type ReplayExportPanelProps = {
  runId: string;
  t: TranslateFunction;
};

// ─── Parallel message group props ─────────────────────────────────────────────

export type ParallelMessageGroupProps = {
  messages: ChatMessage[];
  t: TranslateFunction;
};

// ─── Parallel Compare component props ─────────────────────────────────────────

export type ParallelModelSelectorProps = {
  selectedModels: ParallelModelTarget[];
  onToggleModel: (provider: string, model: string, checked: boolean) => void;
  selectionError: string | null;
  t: TranslateFunction;
};

export type CompareJudgeControlsProps = {
  judgeEnabled: boolean;
  onJudgeEnabledChange: (value: boolean) => void;
  judgeModel: string | null;
  onJudgeModelChange: (value: string | null) => void;
  judgeModelOptions: JudgeModelOption[];
  judgeModelOptionsLoading: boolean;
  t: TranslateFunction;
};

export type ParallelResponseCardProps = {
  response: ParallelModelResponse;
  isFastest: boolean;
  t: TranslateFunction;
};

export type ParallelResultsGridProps = {
  messages: ChatMessage[];
  t: TranslateFunction;
};

export type ParallelSummaryBarProps = {
  messages: ChatMessage[];
  t: TranslateFunction;
};

// ─── Consensus component props ─────────────────────────────────────────────

export type ConsensusSynthesisFinalAnswer = {
  finalAnswer: string;
  agreements: string[];
  disagreements: string[];
  contradictions: string[];
  confidenceLevel: ConsensusConfidenceLevel;
  synthesisRationale: string;
  agreementScore: number;
};

export type ConsensusSynthesisCardProps = {
  synthesis: ConsensusSynthesisFinalAnswer;
  onViewInThread: () => void;
  t: TranslateFunction;
};

export type ConsensusModelBreakdownProps = {
  breakdown: ConsensusModelBreakdown[];
  t: TranslateFunction;
};

export type ConsensusMetadataProps = {
  metadata: ConsensusMetadata;
  onViewInThread: () => void;
  t: TranslateFunction;
};

export type InThreadComparePanelProps = {
  selectedModels: ParallelModelTarget[];
  onToggleModel: (provider: string, model: string, checked: boolean) => void;
  onCompare: (prompt: string) => void;
  onClose: () => void;
  result: ParallelResponse | undefined;
  isPending: boolean;
  canSend: boolean;
  judgeEnabled: boolean;
  onJudgeEnabledChange: (value: boolean) => void;
  judgeModel: string | null;
  onJudgeModelChange: (value: string | null) => void;
  judgeModelOptions: JudgeModelOption[];
  judgeModelOptionsLoading: boolean;
  t: TranslateFunction;
};

// ─── Escalation Chain component props ───────────────────────────────────────

export type EscalationChainBuilderProps = {
  chainModels: EscalationChainStep[];
  onAddModel: (provider: string, model: string) => void;
  onRemoveModel: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  selectionError: string | null;
  t: TranslateFunction;
};

export type EscalationResultCardProps = {
  result: EscalationChainSynthesisState;
  onViewInThread: () => void;
  t: TranslateFunction;
};

export type EscalationStepTimelineProps = {
  stepResults: EscalationStepResult[];
  t: TranslateFunction;
};

// ─── Answer Repair component props ──────────────────────────────────────────

export type RepairTypeSelectorProps = {
  selectedTypes: RepairType[];
  onToggle: (type: RepairType) => void;
  t: TranslateFunction;
};

export type RepairResultCardProps = {
  result: RepairResultState;
  onViewInThread: () => void;
  t: TranslateFunction;
};

// ─── Recovery component props ────────────────────────────────────────────────

export type RecoveryStatsCardProps = {
  totalDecisions: number;
  totalWithFallback: number;
  fallbackRate: number;
  t: TranslateFunction;
};

export type RecoveryProviderTableProps = {
  providerStats: ProviderFailureStat[];
  t: TranslateFunction;
};

export type RecoveryFallbackRowProps = {
  fallback: RecentFallback;
  t: TranslateFunction;
};

// ─── Task Decomposition component props ────────────────────────────────────

export type DecompositionResultCardProps = {
  result: DecompositionResultState;
  onViewInThread: () => void;
  t: TranslateFunction;
};

export type SubTaskResultCardProps = {
  subTask: SubTaskResult;
  index: number;
  t: TranslateFunction;
};

// ─── Best-of-N component props ────────────────────────────────────────────

export type BestOfNResultCardProps = {
  result: BestOfNResultState;
  onViewInThread: () => void;
  t: TranslateFunction;
};

export type CandidateCardProps = {
  candidate: CandidateResult;
  t: TranslateFunction;
};

// ─── Verifier component props ────────────────────────────────────────────────

export type VerifyResultCardProps = {
  result: UseVerifyResultState;
  onViewInThread: () => void;
  t: TranslateFunction;
};

// ─── Adaptive Learning component props ────────────────────────────────────────

export type AdaptiveProviderTableProps = {
  providerInsights: ProviderInsight[];
  t: TranslateFunction;
};

export type AdaptiveModeChartProps = {
  modeInsights: ModeInsight[];
  t: TranslateFunction;
};

export type AdaptiveStatsCardProps = {
  insights: AdaptiveLearningInsights;
  t: TranslateFunction;
};

// ─── Pipeline component props ────────────────────────────────────────────────

export type PipelineResultCardProps = {
  result: PipelineResult;
  onViewInThread: () => void;
  t: TranslateFunction;
};

export type PipelineStageItemProps = {
  stage: PipelineStageResult;
  stageNumber: number;
  t: TranslateFunction;
};

// ─── Cost Ensemble component props ───────────────────────────────────────────

export type CostEnsembleResultCardProps = {
  result: CostEnsembleResult;
  onViewInThread: () => void;
  t: TranslateFunction;
};

export type CostTierBadgeProps = {
  tier: CostTier;
  label: string;
};

// ─── Role Pack component props ────────────────────────────────────────────────

export type RolePackResultCardProps = {
  result: RolePackResult;
  onViewInThread: () => void;
  t: TranslateFunction;
};

export type RolePackMemberCardProps = {
  member: RoleMemberResult;
  t: TranslateFunction;
};

// ─── Workspace connector component props ─────────────────────────────────────

export type WorkspaceConnectorCardProps = {
  connector: WorkspaceConnector;
  onDelete: (id: string) => void;
  onHealthCheck: (id: string) => void;
  onSync: (id: string) => void;
  isDeleting: boolean;
  isCheckingHealth: boolean;
  isSyncing: boolean;
  t: TranslateFunction;
};

export type WorkspaceConnectorStatusBadgeProps = {
  connector: WorkspaceConnector;
  t: TranslateFunction;
};

export type ConnectorStatusBadgeProps = {
  status: WorkspaceConnectorStatus;
};

export type ConnectorDetailViewProps = {
  connector: WorkspaceConnector;
  syncRuns: WorkspaceSyncRun[];
  healthEvents: WorkspaceHealthEvent[];
  recentObjects: WorkspaceObject[];
  isSyncing: boolean;
  isCheckingHealth: boolean;
  isDeleting: boolean;
  isAskingAi: boolean;
  onSync: () => void;
  onHealthCheck: () => void;
  onDelete: () => void;
  onAskAi: () => void;
  t: TranslateFunction;
};

export type WorkspaceObjectListProps = {
  objects: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  t: TranslateFunction;
};

export type WorkspaceSearchResultsProps = {
  results: WorkspaceSearchResult[];
  isLoading: boolean;
  isError: boolean;
  query: string;
  t: TranslateFunction;
};

export type WorkspaceActionStatusBadgeProps = {
  status: WorkspaceAction['status'];
  t: TranslateFunction;
};

export type WorkspaceActionRowProps = {
  action: WorkspaceAction;
  onApprove: (id: string) => void;
  onReject: (action: WorkspaceAction) => void;
  isApproving: boolean;
  t: TranslateFunction;
};

export type WorkspaceActionListProps = {
  actions: WorkspaceAction[];
  isLoading: boolean;
  isError: boolean;
  onApprove: (id: string) => void;
  onReject: (action: WorkspaceAction) => void;
  isApproving: boolean;
  t: TranslateFunction;
};

export type GmailMessageRowProps = {
  message: WorkspaceObject;
  metadata: GmailMessageMetadata;
  onClick: () => void;
  t: TranslateFunction;
};

export type GmailMessageListProps = {
  messages: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  onSelectMessage: (msg: WorkspaceObject) => void;
  t: TranslateFunction;
};

export type GmailMessageDialogProps = {
  message: WorkspaceObject | null;
  open: boolean;
  onClose: () => void;
  onOpenAiAction: (kind: AiActionKind) => void;
  t: TranslateFunction;
};

export type GmailActionsBarProps = {
  message: WorkspaceObject;
  onAction: (kind: AiActionKind) => void;
  isDraftPending: boolean;
  t: TranslateFunction;
};

export type JiraTicketRowProps = {
  ticket: WorkspaceObject;
  metadata: JiraTicketMetadata;
  onClick: () => void;
  t: TranslateFunction;
};

export type JiraTicketListProps = {
  tickets: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  onSelectTicket: (ticket: WorkspaceObject) => void;
  t: TranslateFunction;
};

export type JiraTicketDialogProps = {
  ticket: WorkspaceObject | null;
  open: boolean;
  onClose: () => void;
  onOpenAiAction: (kind: AiActionKind) => void;
  t: TranslateFunction;
};

export type JiraActionsBarProps = {
  ticket: WorkspaceObject;
  onAction: (kind: AiActionKind) => void;
  isDraftPending: boolean;
  t: TranslateFunction;
};

export type PullRequestRowProps = {
  pr: WorkspaceObject;
  metadata: PullRequestMetadata;
  onClick: () => void;
  t: TranslateFunction;
};

export type PullRequestListProps = {
  pullRequests: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  onSelectPr: (pr: WorkspaceObject) => void;
  t: TranslateFunction;
};

export type PullRequestDialogProps = {
  pr: WorkspaceObject | null;
  open: boolean;
  onClose: () => void;
  onOpenAiAction: (kind: AiActionKind) => void;
  t: TranslateFunction;
};

export type SourceControlActionsBarProps = {
  pr: WorkspaceObject;
  onAction: (kind: AiActionKind) => void;
  isDraftPending: boolean;
  t: TranslateFunction;
};

export type SlackMessageRowProps = {
  message: WorkspaceObject;
  metadata: SlackMessageMetadata;
  onClick: () => void;
  t: TranslateFunction;
};

export type SlackMessageListProps = {
  messages: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  onSelectMessage: (msg: WorkspaceObject) => void;
  t: TranslateFunction;
};

export type SlackMessageDialogProps = {
  message: WorkspaceObject | null;
  open: boolean;
  onClose: () => void;
  onOpenAiAction: (kind: AiActionKind) => void;
  t: TranslateFunction;
};

export type SlackActionsBarProps = {
  message: WorkspaceObject;
  onAction: (kind: AiActionKind) => void;
  isDraftPending: boolean;
  t: TranslateFunction;
};

export type DocFileRowProps = {
  doc: WorkspaceObject;
  metadata: DocFileMetadata;
  onClick: () => void;
  t: TranslateFunction;
};

export type DocFileListProps = {
  docs: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  onSelectDoc: (doc: WorkspaceObject) => void;
  t: TranslateFunction;
};

export type DocFileDialogProps = {
  doc: WorkspaceObject | null;
  open: boolean;
  onClose: () => void;
  onOpenAiAction: (kind: AiActionKind) => void;
  t: TranslateFunction;
};

export type DocsActionsBarProps = {
  doc: WorkspaceObject;
  onAction: (kind: AiActionKind) => void;
  isDraftPending: boolean;
  t: TranslateFunction;
};

export type ConfluencePageRowProps = {
  page: WorkspaceObject;
  metadata: ConfluencePageMetadata;
  onClick: () => void;
  t: TranslateFunction;
};

export type ConfluencePageListProps = {
  pages: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  onSelectPage: (page: WorkspaceObject) => void;
  t: TranslateFunction;
};

export type ConfluencePageDialogProps = {
  page: WorkspaceObject | null;
  open: boolean;
  onClose: () => void;
  onOpenAiAction: (kind: AiActionKind) => void;
  t: TranslateFunction;
};

export type ConfluenceActionsBarProps = {
  page: WorkspaceObject;
  onAction: (kind: AiActionKind) => void;
  isDraftPending: boolean;
  t: TranslateFunction;
};

export type FigmaDesignRowProps = {
  design: WorkspaceObject;
  metadata: FigmaDesignMetadata;
  onClick: () => void;
  t: TranslateFunction;
};

export type FigmaDesignListProps = {
  designs: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  onSelect: (design: WorkspaceObject) => void;
  t: TranslateFunction;
};

export type FigmaDesignDialogProps = {
  design: WorkspaceObject | null;
  open: boolean;
  onClose: () => void;
  onOpenAiAction: (kind: AiActionKind) => void;
  t: TranslateFunction;
};

export type FigmaActionsBarProps = {
  design: WorkspaceObject;
  onAction: (kind: AiActionKind) => void;
  isDraftPending: boolean;
  t: TranslateFunction;
};

export type WorkflowObjectRowProps = {
  object: WorkspaceObject;
  isSelected: boolean;
  onAdd: (object: WorkspaceObject) => void;
  onRemove: (id: string) => void;
  t: TranslateFunction;
};

export type WorkflowObjectListProps = {
  objects: WorkspaceObject[];
  selectedItemIds: string[];
  isLoading: boolean;
  isError: boolean;
  onAdd: (object: WorkspaceObject) => void;
  onRemove: (id: string) => void;
  t: TranslateFunction;
};

export type WorkflowSelectedStripProps = {
  selectedItems: WorkspaceObject[];
  onRemove: (id: string) => void;
  onClear: () => void;
  t: TranslateFunction;
};

export type WorkflowActionsBarProps = {
  hasItems: boolean;
  onAction: (kind: AiActionKind) => void;
  t: TranslateFunction;
};
