import type { MessageFeedback } from '@/enums';

import type { ResearchProviderKind } from '../enums/research-provider-kind.enum';

import type { AdaptiveLearningInsights } from './adaptive-learning.types';
import type { AdminUser, AuditLog } from './audit.types';
import type {
  ChatMessage,
  ChatThread,
  FallbackAttemptInfo,
  JudgeModelOption,
  UseVirtualizedMessagesReturn,
} from './chat.types';
import type { ModelSelection } from './component.types';
import type { CostEnsembleResult as CostEnsembleResultType } from './cost-ensemble.types';
import type { UploadFileRequest } from './file.types';
import type { AggregatedHealth } from './health.types';
import type { TranslateFunction } from './i18n.types';
import type { PipelineResult } from './pipeline.types';
import type { RecoveryStats } from './recovery.types';
import type { ReplayCaseDetail, ReplayRunSummary, RunComparisonResult } from './replay-run.types';
import type { ReplayBatchResult } from './replay.types';
import type { ResearchOptions, SanitizedResearchProvider } from './research.types';
import type {
  WorkspaceConnector,
  WorkspaceHealthEvent,
  WorkspaceObject,
  WorkspaceSearchResult,
  WorkspaceSyncRun,
} from './workspace.types';

// ─── Admin hook types ───────────────────────────────────────────────────────

export type UseAdminPageReturn = {
  t: TranslateFunction;
  user: { role: string } | null;
  actionPending: string | null;
  users: AdminUser[];
  activeCount: number;
  usersQuery: {
    isLoading: boolean;
    isError: boolean;
  };
  healthQuery: {
    isLoading: boolean;
    isError: boolean;
    data: AggregatedHealth | undefined;
  };
  handleChangeRole: (userId: string, role: string) => void;
  handleDeactivate: (userId: string) => void;
  isRoleChangePending: boolean;
  isDeactivatePending: boolean;
};

export type UseUserTableStateReturn = {
  editingUserId: string | null;
  setEditingUserId: (id: string | null) => void;
  handleRoleSelect: (
    userId: string,
    role: string,
    onChangeRole: (userId: string, role: string) => void,
  ) => void;
};

// ─── Audit hook types ───────────────────────────────────────────────────────

export type UseAuditsPageReturn = {
  t: TranslateFunction;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  action: string | undefined;
  setAction: (value: string | undefined) => void;
  severity: string | undefined;
  setSeverity: (value: string | undefined) => void;
  search: string;
  setSearch: (value: string) => void;
  auditLogs: AuditLog[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  isLoading: boolean;
  isError: boolean;
  handleActionChange: (value: string | undefined) => void;
  handleSeverityChange: (value: string | undefined) => void;
  handleSearchChange: (value: string) => void;
};

// ─── Chat hook types ────────────────────────────────────────────────────────

export type UseFileAttachmentPickerStateParams = {
  selectedFileIds: string[];
  onChange: (fileIds: string[]) => void;
  uploadFile: (data: UploadFileRequest) => void;
};

export type UseFileAttachmentPickerStateReturn = {
  dragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleToggle: (fileId: string, checked: boolean) => void;
  handleFileUpload: (file: File) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  selectedCount: number;
};

export type UseImageErrorStateReturn = {
  isPickerOpen: boolean;
  togglePicker: () => void;
  closePicker: () => void;
};

export type UseImageGenerationBubbleStateParams = {
  generationId: string;
};

export type UseImageGenerationBubbleStateReturn = {
  activeGenId: string;
  handleRetry: () => void;
  handleRetryWithModel: (provider: string, model: string) => void;
};

export type UseMessageComposerStateParams = {
  onSend: (
    content: string,
    modelSelection?: ModelSelection,
    fileIds?: string[],
    research?: ResearchOptions,
  ) => void;
  isPending: boolean;
  selectedModel: ModelSelection | null;
};

export type UseMessageComposerStateReturn = {
  content: string;
  setContent: (value: string) => void;
  validationError: string | null;
  selectedFileIds: string[];
  setSelectedFileIds: (value: string[]) => void;
  research: ResearchOptions;
  setResearch: (value: ResearchOptions) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

export type UseThreadDetailPageParams = {
  threadId: string;
};

export type UseThreadSettingsReturn = {
  isOpen: boolean;
  toggleOpen: () => void;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  maxTokens: string;
  setMaxTokens: (value: string) => void;
  selectedModel: ModelSelection | null;
  setSelectedModel: (value: ModelSelection | null) => void;
  handleModelChange: (value: ModelSelection | null) => void;
  contextPackIds: string[];
  setContextPackIds: (value: string[]) => void;
  judgeEnabled: boolean;
  setJudgeEnabled: (value: boolean) => void;
  judgeModel: string | null;
  setJudgeModel: (value: string | null) => void;
  judgeModelOptions: JudgeModelOption[];
  qualityThreshold: number;
  setQualityThreshold: (value: number) => void;
  maxReRouteAttempts: number;
  setMaxReRouteAttempts: (value: number) => void;
  handleSave: () => void;
  isPending: boolean;
};

export type UseThreadDetailPageReturn = {
  thread: ChatThread | null;
  messages: ChatMessage[];
  isLoadingThread: boolean;
  isLoadingMessages: boolean;
  isWaitingForResponse: boolean;
  fallbackAttempts: FallbackAttemptInfo[];
  streamError: string | null;
  judgeEvaluating: boolean;
  executingModel: string | null;
  judgeModel: string | null;
  isSending: boolean;
  isDeleting: boolean;
  virtualizedMessages: UseVirtualizedMessagesReturn;
  threadSettings: UseThreadSettingsReturn;
  handleSend: (
    content: string,
    modelSelection?: ModelSelection,
    fileIds?: string[],
    research?: ResearchOptions,
  ) => void;
  handleDelete: () => void;
  handleFeedback: (messageId: string, feedback: MessageFeedback | null) => void;
  handleRegenerate: (messageId: string) => void;
};

export type UseVirtualizedThreadsParams = {
  search?: string;
  showArchived?: boolean;
};

// ─── Common hook types ──────────────────────────────────────────────────────

export type UseToggleReturn = {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
};

// ─── Files hook types ───────────────────────────────────────────────────────

export type UseFileUploadZoneStateReturn = {
  isDragOver: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleClick: () => void;
};

// ─── Layout hook types ──────────────────────────────────────────────────────

export type UseGlobalSearchControllerReturn = {
  inputRef: React.RefObject<HTMLInputElement | null>;
  threads: ChatThread[];
  isLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  isOpen: boolean;
  showResults: boolean;
  handleToggle: () => void;
  handleSelect: (threadId: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleOpenChange: (open: boolean) => void;
};

export type UseSidebarControllerReturn = {
  isOpen: boolean;
  close: () => void;
  handleOverlayClick: () => void;
};

export type UseSidebarNavItemStateReturn = {
  expanded: boolean;
  toggle: () => void;
};

// ─── Replay hook types ────────────────────────────────────────────────────

export type UseReplayLabPageReturn = {
  t: TranslateFunction;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  routingMode: string | undefined;
  setRoutingMode: (value: string | undefined) => void;
  threadId: string;
  setThreadId: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  limit: number;
  setLimit: (value: number) => void;
  saveRun: boolean;
  setSaveRun: (value: boolean) => void;
  runName: string;
  setRunName: (value: string) => void;
  handleRunReplay: () => void;
  result: ReplayBatchResult | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  runs: ReplayRunSummary[];
  isRunsLoading: boolean;
  suspiciousCases: ReplayCaseDetail[];
  isSuspiciousLoading: boolean;
  handleReviewCase: (caseId: string, isRegression: boolean, notes: string) => void;
  isReviewPending: boolean;
  handlePromoteCase: (caseId: string) => void;
  isPromotePending: boolean;
  compareRunId1: string | null;
  compareRunId2: string | null;
  setCompareRunId1: (id: string | null) => void;
  setCompareRunId2: (id: string | null) => void;
  compareResult: RunComparisonResult | undefined;
  isCompareLoading: boolean;
};

// ─── Recovery hook types ─────────────────────────────────────────────────────

export type UseRecoveryPageReturn = {
  t: TranslateFunction;
  data: RecoveryStats | undefined;
  isLoading: boolean;
  isError: boolean;
};

// ─── Adaptive Learning hook types ────────────────────────────────────────────

export type UseAdaptiveLearningPageReturn = {
  t: TranslateFunction;
  insights: AdaptiveLearningInsights | undefined;
  isLoading: boolean;
  isError: boolean;
  windowDays: number;
  setWindowDays: (days: number) => void;
};

// ─── Cost Ensemble hook types ─────────────────────────────────────────────────

export type UseCostEnsembleHookPageReturn = {
  t: TranslateFunction;
  content: string;
  setContent: (v: string) => void;
  handleSend: () => void;
  canSend: boolean;
  isPending: boolean;
  isError: boolean;
  isCostEnsembleError: boolean;
  costEnsembleResult: CostEnsembleResultType | null;
  isPolling: boolean;
  isCostEnsembleReady: boolean;
  handleViewInThread: () => void;
};

// ─── Pipeline hook types ─────────────────────────────────────────────────────

export type UsePipelinePageHookReturn = {
  t: TranslateFunction;
  content: string;
  setContent: (value: string) => void;
  template: string;
  setTemplate: (value: string) => void;
  handleSend: () => void;
  canSend: boolean;
  isPending: boolean;
  isError: boolean;
  isPipelineError: boolean;
  pipelineResult: PipelineResult | null;
  isPolling: boolean;
  isPipelineReady: boolean;
  handleViewInThread: () => void;
};

// ─── Workspace hook types ─────────────────────────────────────────────────────

export type UseWorkspacePageReturn = {
  connectors: WorkspaceConnector[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  selectedConnector: WorkspaceConnector | null;
  setSelectedConnector: (c: WorkspaceConnector | null) => void;
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
  handleDelete: (id: string) => void;
  handleHealthCheck: (id: string) => void;
  handleSync: (id: string) => void;
  isDeleting: boolean;
  isCheckingHealth: boolean;
  isSyncing: boolean;
};

export type UseWorkspaceSearchPageReturn = {
  query: string;
  setQuery: (value: string) => void;
  results: WorkspaceSearchResult[];
  total: number;
  isLoading: boolean;
  isError: boolean;
};

export type UseWorkspaceObjectDetailReturn = {
  object: WorkspaceObject | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isRefreshing: boolean;
  refreshError: Error | null;
  refresh: () => void;
};

export type UseWorkspaceSyncRunsReturn = {
  runs: WorkspaceSyncRun[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

export type UseWorkspaceObjectDetailPageReturn = {
  t: TranslateFunction;
  objectId: string;
  object: WorkspaceObject | undefined;
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  refreshError: Error | null;
  onRefresh: () => void;
  onBack: () => void;
};

export type UseConnectorDetailPageReturn = {
  t: TranslateFunction;
  connectorId: string;
  connector: WorkspaceConnector | undefined;
  syncRuns: WorkspaceSyncRun[];
  healthEvents: WorkspaceHealthEvent[];
  recentObjects: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSyncing: boolean;
  isCheckingHealth: boolean;
  isDeleting: boolean;
  isActivating: boolean;
  isAskingAi: boolean;
  onSync: () => void;
  onHealthCheck: () => void;
  onDelete: () => void;
  onAskAi: () => void;
  onBack: () => void;
};

export type ResearchProviderFormState = {
  kind: ResearchProviderKind;
  name: string;
  baseUrl: string;
  apiKey: string;
};

export type UseResearchProvidersPageReturn = {
  t: TranslateFunction;
  providers: SanitizedResearchProvider[];
  isLoading: boolean;
  isError: boolean;
  isCreateOpen: boolean;
  openCreate: () => void;
  closeCreate: () => void;
  form: ResearchProviderFormState;
  setFormField: <K extends keyof ResearchProviderFormState>(
    key: K,
    value: ResearchProviderFormState[K],
  ) => void;
  isCreatePending: boolean;
  createError: string | null;
  isDeletePending: boolean;
  isTestPending: boolean;
  lastTestMessage: string | null;
  handleSubmit: () => Promise<void>;
  handleDelete: (id: string) => void;
  handleTest: (id: string) => void;
};
