import type { UseFormReturn } from 'react-hook-form';

import type { MessageFeedback } from '@/enums';
import type { ScrollDirection } from '@/enums/scroll-direction.enum';
import type { LoginFormValues } from '@/lib/validation/login.schema';
import type {
  ForgotPasswordFormValues,
  ResetPasswordFormValues,
} from '@/lib/validation/password-reset.schema';
import type { FollowOutputCallback, VirtuosoHandle } from '@/lib/virtuoso';

import type { SidebarItem } from '../constants/sidebar.constants';
import type { ResearchProviderKind } from '../enums/research-provider-kind.enum';

import type { AdaptiveLearningInsights } from './adaptive-learning.types';
import type { AdminUser, AuditLog } from './audit.types';
import type { AdminUserUpdateRequest } from './auth.types';
import type {
  ChatMessage,
  ChatThread,
  CreateMessageRequest,
  FallbackAttemptInfo,
  JudgeModelOption,
  MessageRenderItem,
  StreamLiveState,
  UseVirtualizedMessagesReturn,
  VisibleProgressStage,
} from './chat.types';
import type {
  ChatThreadShellProps,
  ModelSelection,
  VirtualizedMessagesProps,
} from './component.types';
import type { CostEnsembleResult as CostEnsembleResultType } from './cost-ensemble.types';
import type { UploadFileRequest } from './file.types';
import type { AggregatedHealth } from './health.types';
import type { TranslateFunction } from './i18n.types';
import type { PipelineResult } from './pipeline.types';
import type { PlanView } from './plan.types';
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

// ─── Auth hook types ────────────────────────────────────────────────────────

export type UseLoginFormReturn = {
  form: UseFormReturn<LoginFormValues>;
  showPassword: boolean;
  togglePasswordVisibility: () => void;
  rememberMe: boolean;
  handleRememberMeChange: (checked: boolean) => void;
  handleForgotPasswordClick: () => void;
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  isPending: boolean;
  isError: boolean;
  errorMessage: string | null;
  t: TranslateFunction;
};

export type UseForgotPasswordFormReturn = {
  form: UseFormReturn<ForgotPasswordFormValues>;
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  isPending: boolean;
  isSuccess: boolean;
  errorMessage: string | null;
  t: TranslateFunction;
};

export type UseResetPasswordFormReturn = {
  form: UseFormReturn<ResetPasswordFormValues>;
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  isInvalidToken: boolean;
  errorMessage: string | null;
  t: TranslateFunction;
};

export type UseRedirectIfAuthenticatedReturn = {
  // False while auth state is still hydrating or a redirect is in flight —
  // the auth page must not render its form until this is true, otherwise an
  // already-logged-in user briefly sees the login form before the redirect.
  shouldRenderAuthPage: boolean;
};

// ─── Admin hook types ───────────────────────────────────────────────────────

export type UseAdminPageReturn = {
  t: TranslateFunction;
  user: { role: string } | null;
  actionPending: string | null;
  users: AdminUser[];
  usersMeta: { total: number; page: number; limit: number; totalPages: number } | undefined;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  search: string;
  setSearch: (value: string) => void;
  roleFilter: string;
  setRoleFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  planFilter: string;
  setPlanFilter: (value: string) => void;
  verificationFilter: string;
  setVerificationFilter: (value: string) => void;
  plans: PlanView[];
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
  handleReactivate: (userId: string) => void;
  handleAssignPlan: (userId: string, planId: string) => void;
  handleUpdateUser: (userId: string, data: AdminUserUpdateRequest) => void;
  handleTemporaryPassword: (userId: string) => void;
  isRoleChangePending: boolean;
  isDeactivatePending: boolean;
  isReactivatePending: boolean;
  isAssignPlanPending: boolean;
  isUpdateUserPending: boolean;
  isTemporaryPasswordPending: boolean;
};

export type UseUserTableStateReturn = {
  editingUserId: string | null;
  setEditingUserId: (id: string | null) => void;
  handleRoleSelect: (
    userId: string,
    role: string,
    onChangeRole: (userId: string, role: string) => void,
  ) => void;
  profileEditingId: string | null;
  editUsername: string;
  editEmail: string;
  setEditUsername: (value: string) => void;
  setEditEmail: (value: string) => void;
  startProfileEdit: (user: AdminUser) => void;
  finishProfileEdit: (onUpdate: (userId: string, data: AdminUserUpdateRequest) => void) => void;
};

export type UseRecentAuditEventsReturn = {
  events: AuditLog[];
  isLoading: boolean;
  isError: boolean;
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

// Reusable composer attachment ingestion (paste / drop / file-input). Uploads
// each file through the existing secure upload pipeline and, on success, adds
// the resulting fileId to the caller's selected-file list so it is sent to the
// model exactly like a paperclip-picked file.
export type UseComposerAttachmentsParams = {
  selectedFileIds: string[];
  onChange: (fileIds: string[]) => void;
  disabled?: boolean;
};

export type UseComposerAttachmentsReturn = {
  ingestFiles: (files: FileList | File[] | null | undefined) => void;
  isUploading: boolean;
  pendingCount: number;
};

export type UseComposerDropzoneParams = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
};

export type UseComposerDropzoneReturn = {
  isDragActive: boolean;
  handlePaste: (event: React.ClipboardEvent) => void;
  handleDragOver: (event: React.DragEvent) => void;
  handleDragEnter: (event: React.DragEvent) => void;
  handleDragLeave: (event: React.DragEvent) => void;
  handleDrop: (event: React.DragEvent) => void;
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
  researchProviders: SanitizedResearchProvider[];
  isResearchProvidersLoading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  // Paste / drop ingestion — uploads files and appends their ids to
  // selectedFileIds so they are sent to the model like picked files.
  ingestFiles: (files: FileList | File[]) => void;
  isUploadingAttachment: boolean;
};

// Inputs to the keyboard / autosize / IME controller for RichPromptTextarea.
// The component itself stays a pure render — useRichPromptTextarea owns the
// imperative DOM glue and exposes a ref + handler bag.
export type UseRichPromptTextareaParams = {
  value: string;
  onChange: (next: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  minRows?: number;
  maxRows?: number;
};

export type UseRichPromptTextareaReturn = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleCompositionStart: () => void;
  handleCompositionEnd: () => void;
};

export type UseThreadDetailPageParams = {
  threadId: string;
};

export type UseThreadDataControllerParams = {
  threadId: string;
  t: TranslateFunction;
};

export type UseSendMessageResult = {
  sendMessage: (data: CreateMessageRequest) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  errorMessage: string | null;
};

export type UseThreadDataControllerReturn = {
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
  progressStages: VisibleProgressStage[];
  currentStageLabel: string | null;
  streamLive: StreamLiveState;
  cancelStream: () => void;
  isCancellingStream: boolean;
  isSending: boolean;
  isDeleting: boolean;
  virtualizedMessages: UseVirtualizedMessagesReturn;
  virtualizedMessagesProps: VirtualizedMessagesProps;
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
  judgeModelOptionsLoading: boolean;
  criticEnabled: boolean;
  setCriticEnabled: (value: boolean) => void;
  criticModel: string | null;
  setCriticModel: (value: string | null) => void;
  criticEnablementDisabled: boolean;
  qualityThreshold: number;
  setQualityThreshold: (value: number) => void;
  maxReRouteAttempts: number;
  setMaxReRouteAttempts: (value: number) => void;
  useMemory: boolean;
  setUseMemory: (value: boolean) => void;
  useContext: boolean;
  setUseContext: (value: boolean) => void;
  handleSave: () => void;
  isPending: boolean;
  maxTokensError: string | null;
  canSave: boolean;
};

// Field-level validation state for the thread-settings form. `maxTokensError`
// carries already-translated text so the .tsx stays a pure render.
export type ThreadSettingsValidation = {
  maxTokensError: string | null;
  canSave: boolean;
};

// Return shape of the page-bootstrap controller hook. The .tsx renders a
// single <ChatThreadShell {...shellProps} /> with this prop bag — see
// `apps/claw-frontend/CLAUDE.md` rule 12: page TSX may call EXACTLY ONE
// controller hook. The shellProps bag carries everything the shell needs
// (header / messages / composer / in-thread compare / thread settings).
export type UseThreadDetailPageReturn = {
  shellProps: ChatThreadShellProps;
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
  // Wraps the trigger, the expanded field and the results popover, so an
  // outside-press can be distinguished from a press on the search itself.
  containerRef: React.RefObject<HTMLDivElement | null>;
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
  items: SidebarItem[];
};

export type UseSidebarNavItemStateReturn = {
  expanded: boolean;
  toggle: () => void;
};

export type UseSidebarVisibleItemsReturn = {
  items: SidebarItem[];
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

// ─── Virtualized messages controller / streaming follow ─────────────────────

// Inputs to useVirtualizedMessagesController. The controller composes
// useFollowStreamingTokens with the Virtuoso wiring callbacks and produces
// the flat prop bag (`VirtualizedMessagesProps`) the .tsx spreads.
export type UseVirtualizedMessagesControllerParams = {
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
  streamLive?: StreamLiveState;
  onCancelStream?: () => void;
  isCancellingStream?: boolean;
  onStartReached: () => void;
  onFeedback: (messageId: string, feedback: MessageFeedback | null) => void;
  onRegenerate: (messageId: string) => void;
  // i18n surface forwarded into sub-components.
  loadingLabel: string;
  emptyLabel: string;
  jumpToLatestLabelKey: string;
  t: TranslateFunction;
};

export type UseVirtualizedMessagesControllerReturn = {
  // Display states the .tsx renders directly.
  isLoading: boolean;
  isEmpty: boolean;
  loadingLabel: string;
  emptyLabel: string;
  persistentError: string | null;
  // Virtuoso wiring.
  virtuosoRef: React.Ref<VirtuosoHandle>;
  renderItems: MessageRenderItem[];
  itemContent: (index: number, item: MessageRenderItem) => React.ReactElement;
  headerContent: () => React.ReactElement | null;
  footerContent: () => React.ReactElement | null;
  handleFollowOutput: FollowOutputCallback;
  onAtBottomStateChange: (atBottom: boolean) => void;
  handleStartReached: () => void;
  initialTopMostItemIndex: number;
  increaseViewportBy: { top: number; bottom: number };
  firstItemIndex: number;
  // Jump-to-latest pill. `unreadCount` (Phase 4) tracks messages that
  // arrived while the user was scrolled away from the bottom.
  showJumpToLatest: boolean;
  onJumpToLatest: () => void;
  unreadCount: number;
  // Forwarded so the .tsx can spread a single prop bag onto
  // <VirtualizedMessages> without re-wiring i18n.
  t: TranslateFunction;
};

// useFollowStreamingTokens — watches the last message's content length plus
// the sticky-bottom state, and imperatively scrolls Virtuoso to the last
// row when the assistant's tokens are appended in place during streaming.
//
// Virtuoso's native followOutput only triggers when the messages-array length
// changes; it cannot detect intra-row content growth. This hook bridges that
// gap.
export type UseFollowStreamingTokensParams = {
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  isAtBottom: boolean;
  lastMessageId: string | null;
  lastContentLength: number;
  lastIndex: number;
};

// ─── UI primitive hook returns (Phase 1 design-system foundation) ───────────

export type UseCopyButtonReturn = {
  copied: boolean;
  onClick: () => Promise<void>;
};

export type UseKeyboardShortcutOptions = {
  enabled?: boolean;
  preventDefault?: boolean;
};

export type UseScrollDirectionReturn = ScrollDirection | null;
