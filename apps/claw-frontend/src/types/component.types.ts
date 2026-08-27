import type { LucideIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

import type { SidebarItem } from '@/constants';
import type {
  AiReasoningVisibility,
  AiStreamStage,
  ChatThreadListTab,
  CompareJudgeState,
  CompareResearchMode,
  ComponentSize,
  ConnectorAuthType,
  ConnectorProvider,
  ConnectorStatus,
  CostTier,
  DashboardGreetingKey,
  DashboardOperationalState,
  ExecutionProfile,
  HealthStatus,
  MessageFeedback,
  ModelCatalogViewMode,
  OptionalService,
  PlanFeature,
  RepairType,
  ReplayOutcomeLabel,
  ResponsiveGridColumns,
  ResponsivePageWidth,
  RoutingMode,
  ThreadDateGroup,
} from '@/enums';
import type { AiActionKind } from '@/enums/ai-action-kind.enum';
import type { AlertVariant } from '@/enums/alert-variant.enum';
import type { BadgeTone } from '@/enums/badge-tone.enum';
import type { CodingAgentInstallFigure } from '@/enums/coding-agent-install-figure.enum';
import type { ComposerControlVariant } from '@/enums/composer-control-variant.enum';
import type { ConsensusConfidenceLevel } from '@/enums/consensus-confidence-level.enum';
import type { CopyButtonVariant } from '@/enums/copy-button-variant.enum';
import type { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import type { LoadingStateVariant } from '@/enums/loading-state.enum';
import type { Locale } from '@/enums/locale.enum';
import type { ResearchProviderKind } from '@/enums/research-provider-kind.enum';
import type { ResolvedTheme, Theme } from '@/enums/theme.enum';
import type { WorkspaceConnectorStatus } from '@/enums/workspace-connector-status.enum';
import type {
  ConfirmOtpFormValues,
  RequestEmailChangeFormValues,
} from '@/lib/validation/email-change.schema';
import type { FollowOutputCallback, VirtuosoHandle } from '@/lib/virtuoso';
import type {
  OwnerChatShare,
  PublicChatShareAsset,
  PublicChatShareMessage,
} from '@/types/chat-share.types';
import type { TranslationDictionary, TranslateFunction } from '@/types/i18n.types';
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
import type { AdminUserActor } from './admin-user-capability.types';
import type { RepairResultState } from './answer-repair.types';
import type { AdminUser, AuditLog } from './audit.types';
import type {
  AdminCreateUserRequest,
  AdminUserUpdateRequest,
  EmailChangePendingState,
} from './auth.types';
import type { BestOfNResultState, CandidateResult } from './best-of-n.types';
import type { DownloadStats, ModelCatalogEntry, PullJobResponse } from './catalog.types';
import type { ChatLimitNotice } from './chat-limit-notice.types';
import type {
  ChatMessage,
  ChatThread,
  FallbackAttemptInfo,
  JudgeModelOption,
  MessageRenderItem,
  StreamLiveState,
  StreamMetrics,
  StreamStageTimings,
  StreamUsage,
  UseEditableTitleReturn,
  VisibleProgressStage,
} from './chat.types';
import type { ConfluencePageMetadata } from './confluence.types';
import type { SharedConnectorView } from './connector-grant.types';
import type {
  Connector,
  ConnectorFormFieldErrors,
  ConnectorModel,
  CreateConnectorRequest,
} from './connector.types';
import type { ConsensusMetadata, ConsensusModelBreakdown } from './consensus.types';
import type {
  ContextPack,
  ContextPackItem,
  CreateContextPackItemRequest,
  CreateContextPackRequest,
} from './context-pack.types';
import type { CostEnsembleResult } from './cost-ensemble.types';
import type { DashboardQuickAction, DashboardStatCard } from './dashboard.types';
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
import type { UseInThreadSearchReturn } from './hook.types';
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
import type { PasswordStrengthResult } from './password-strength.types';
import type { PipelineResult, PipelineStageResult } from './pipeline.types';
import type { PlanView } from './plan.types';
import type { ProviderFailureStat, RecentFallback } from './recovery.types';
import type { ReplayCaseDetail, ReplayRunSummary, RunComparisonResult } from './replay-run.types';
import type { ReplayBatchResult, ReplayResult } from './replay.types';
import type { RoleMemberResult, RolePackResult } from './role-pack.types';
import type { CreatePolicyRequest, RoutingDecision, RoutingPolicy } from './routing.types';
import type { ClawRuntimeProgressEnvelope } from './runtime-progress-envelope.types';
import type { RuntimeProgressMetrics } from './runtime-progress.types';
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
  // Optional richer rendering that is used only when the column is promoted
  // to the mobile-card title (selected via DataTableProps.mobileTitleKey).
  // When omitted, `render` is reused as the title. Useful for columns whose
  // desktop cell is plain text but whose mobile header should include a
  // secondary line (e.g. an identifier underneath the primary label).
  renderMobileTitle?: (row: T) => React.ReactNode;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  // Selects which column is promoted to the mobile-card header (the
  // referenced column is then suppressed from the dl below the title so
  // the primary identifier isn't repeated on small screens). When
  // omitted, the first column is used.
  mobileTitleKey?: string;
  className?: string;
};

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  // UI/UX refactor — phase 5 sweep. `description` is optional so empty states
  // that are already self-explanatory in their title don't need a redundant
  // second line. Most consumers still pass one for context, but flow-control
  // pages (e.g. "no frontier models match your filters") use the title alone.
  description?: string;
  action?: React.ReactNode;
  // UI/UX refactor — phase 1 foundation. `default` keeps the historical
  // dashed-border card; `compact` is used inside small panels (sidebar, drawer);
  // `page` centers content in a tall (60vh) page-level container.
  variant?: EmptyStateVariant;
};

export type TextSkeletonProps = {
  lines?: number;
  className?: string;
};

export type AvatarSkeletonProps = {
  size?: ComponentSize;
  className?: string;
};

export type TableRowSkeletonProps = {
  cols?: number;
  className?: string;
};

export type CopyButtonProps = {
  text: string;
  label?: string;
  size?: ComponentSize;
  variant?: CopyButtonVariant;
  className?: string;
};

export type ResponsiveTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

export type ResponsiveTableProps<T> = {
  rows: T[];
  columns: ResponsiveTableColumn<T>[];
  keyExtractor: (row: T) => string;
  mobileTitle: (row: T) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
};

export type AlertProps = {
  variant?: AlertVariant;
  icon?: LucideIcon;
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

// Next.js App Router error.tsx contract: the framework passes the thrown error
// (optionally with a `digest`) plus a `reset` callback that re-renders the
// segment subtree.
export type RouteErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export type RouteErrorBoundaryView = {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
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
  badges?: React.ReactNode;
};

export type ResponsivePageProps = {
  children: React.ReactNode;
  width?: ResponsivePageWidth;
  fullHeight?: boolean;
  className?: string;
};

export type ResponsiveGridProps = {
  children: React.ReactNode;
  columns?: ResponsiveGridColumns;
  className?: string;
};

export type ErrorStateProps = {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  retryLabel?: string;
  requestId?: string;
  icon?: React.ReactNode;
  className?: string;
};

export type LoadingStateProps = {
  variant?: LoadingStateVariant;
  rows?: number;
  className?: string;
  label?: string;
};

export type StatusBadgeProps = {
  status: ConnectorStatus | string;
  className?: string;
};

export type KbdHintProps = {
  // Each entry renders as its own glyph pip inside a single .kbd-hint pill,
  // e.g. ['⌘', 'K'] becomes ⌘K next to a trigger button. Keep entries short —
  // longer labels (Ctrl, Shift) are fine too, they just take up more width.
  keys: string[];
  className?: string;
};

// ─── Layout component props ──────────────────────────────────────────────────

export type SidebarNavItemProps = {
  item: SidebarItem;
};

export type ServiceAvailabilityBoundaryProps = {
  service: OptionalService;
  children: React.ReactNode;
};

export type ModelsAvailabilityLayoutProps = {
  children: React.ReactNode;
};

// One node in the topbar breadcrumb trail. `labelKey` is an i18n key; `href` is
// the route the crumb links to (the last crumb renders as plain current-page text).
export type BreadcrumbCrumb = {
  labelKey: string;
  href: string;
};

export type BreadcrumbProps = {
  className?: string;
};

// A breadcrumb crumb after i18n resolution, ready for render.
export type ResolvedCrumb = {
  label: string;
  href: string;
  isCurrent: boolean;
};

// Reusable confirmation dialog built on the shadcn Dialog primitive (no new
// radix dependency). Controlled via `open`/`onOpenChange`; `onConfirm` fires
// then the host closes it. `isConfirming` shows a spinner + disables actions.
export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  isConfirming?: boolean;
};

export type PortalContentProps = {
  children: React.ReactNode;
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
  uploadProgress?: number;
  uploadingFilename?: string | null;
};

export type FileListItemProps = {
  file: UploadedFile;
  onDelete: (id: string) => void;
  onViewChunks: (id: string) => void;
  isDeletePending: boolean;
};

export type FileRetentionBadgeProps = {
  retentionExpiresAt: string | null | undefined;
};

export type UseFileRetentionBadgeReturn = {
  shouldRender: boolean;
  label: string;
  toneClass: string;
};

// ─── Form validation types ──────────────────────────────────────────────────

export type FormFieldErrors = Record<string, string[] | undefined>;

// ─── Page-specific types ─────────────────────────────────────────────────────

export type ProvidersProps = {
  children: React.ReactNode;
  initialLocale: Locale;
  initialDictionary: TranslationDictionary;
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  // Integration V2 — per-thread toggles
  useMemory: boolean;
  onUseMemoryChange: (value: boolean) => void;
  useContext: boolean;
  onUseContextChange: (value: boolean) => void;
  onSave: () => void;
  isPending: boolean;
  // Plan-feature gate: when false the judge toggle + judge-model selector are
  // hidden entirely. ADMIN passes true via usePlanFeatures.
  // Already-translated inline error for the maxTokens field, or null when the
  // value is acceptable to the update-thread Zod schema.
  maxTokensError: string | null;
  canSave: boolean;
};

export type ThreadQualityPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: TranslateFunction;
  judgeEnabled: boolean;
  onJudgeEnabledChange: (value: boolean) => void;
  judgeModel: string | null;
  onJudgeModelChange: (value: string | null) => void;
  judgeModelOptions: JudgeModelOption[];
  judgeModelOptionsLoading: boolean;
  criticEnabled: boolean;
  onCriticEnabledChange: (value: boolean) => void;
  criticModel: string | null;
  onCriticModelChange: (value: string | null) => void;
  criticEnablementDisabled: boolean;
  qualityThreshold: number;
  onQualityThresholdChange: (value: number) => void;
  maxReRouteAttempts: number;
  onMaxReRouteAttemptsChange: (value: number) => void;
  onSave: () => void;
  isPending: boolean;
  canSave: boolean;
  allowJudgeMode: boolean;
  allowCriticReview: boolean;
};

export type JudgeRefereeDetailsProps = {
  message: ChatMessage;
};

// Props for the small critic-section inside the Judge Review modal. Extracted
// so the parent .tsx renders a single component instead of a 4-branch nested
// ternary (which the no-nested-ternary lint rule forbids).
export type JudgeReviewCriticSectionProps = {
  criticRequested: boolean;
  criticParseFailed: boolean;
  criticFeedback: string[];
  criticSummary: string;
  t: TranslateFunction;
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

export type UserFiltersProps = {
  t: TranslateFunction;
  plans: PlanView[];
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
};

export type UserTableProps = {
  users: AdminUser[];
  plans: PlanView[];
  /**
   * The signed-in administrator. Needed to tell "this row is the super
   * administrator" from "this row is me" — without it the super administrator
   * saw their own row fully disabled.
   */
  actor: AdminUserActor | null;
  pendingId: string | null;
  onChangeRole: (userId: string, role: string) => void;
  onDeactivate: (userId: string) => void;
  onReactivate: (userId: string) => void;
  onActivate: (userId: string) => void;
  onAssignPlan: (userId: string, planId: string) => void;
  onUpdateUser: (userId: string, data: AdminUserUpdateRequest) => void;
  onTemporaryPassword: (userId: string) => void;
  isRoleChangePending: boolean;
  isDeactivatePending: boolean;
  isReactivatePending: boolean;
  isActivatePending: boolean;
  isAssignPlanPending: boolean;
  isUpdateUserPending: boolean;
  isTemporaryPasswordPending: boolean;
};

export type TemporaryPasswordDialogProps = {
  open: boolean;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  t: TranslateFunction;
};

export type EmailChangeCardProps = {
  pendingState: EmailChangePendingState | null;
  requestForm: UseFormReturn<RequestEmailChangeFormValues>;
  otpForm: UseFormReturn<ConfirmOtpFormValues>;
  onSubmitRequest: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onSubmitOtp: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onResendOtp: () => void;
  onCancelChange: () => void;
  resendCooldownSeconds: number;
  t: TranslateFunction;
  isLoading: boolean;
  isRequesting: boolean;
  isVerifying: boolean;
  isResending: boolean;
  isCancelling: boolean;
};

export type EmailChangeOtpStepProps = {
  pendingState: EmailChangePendingState;
  otpForm: UseFormReturn<ConfirmOtpFormValues>;
  onSubmitOtp: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onResendOtp: () => void;
  onCancelChange: () => void;
  resendCooldownSeconds: number;
  t: TranslateFunction;
  isVerifying: boolean;
  isResending: boolean;
  isCancelling: boolean;
};

// ─── Chat component props ───────────────────────────────────────────────────

export type MessageBubbleProps = {
  message: ChatMessage;
  routingDecision?: RoutingDecision | null;
  onFeedback?: (messageId: string, feedback: MessageFeedback | null) => void;
  onRegenerate?: (messageId: string) => void;
};

// ─── Runtime progress panel props ───────────────────────────────────────────
// Top-level pluggable panel that replaces the monolithic ThinkingIndicator.
// Composes existing stream-* primitives with new runtime-neutral sub-panels
// (visible reasoning, runtime metrics, raw events drawer, stage timeline).
// PR1 keeps the surface identical to ThinkingIndicatorProps; PR2 hooks the
// extra runtime metrics + execution profile + raw events into the dataflow.
export type RuntimeProgressPanelProps = {
  className?: string;
  fallbackAttempts?: FallbackAttemptInfo[];
  streamError?: string | null;
  judgeEvaluating?: boolean;
  executingModel?: string | null;
  judgeModel?: string | null;
  progressStages?: VisibleProgressStage[];
  currentStageLabel?: string | null;
  streamLive?: StreamLiveState;
  onCancel?: () => void;
  isCancelling?: boolean;
  // PR2: when true, renders the collapsible RuntimeRawEventsDrawer below the
  // live answer (dev-only). Defaults to false — current call-sites do not
  // pass this and ship a noop drawer surface.
  showRawEvents?: boolean;
  // PR2: stream of raw events forwarded into RuntimeRawEventsDrawer when
  // showRawEvents is true. Kept as unknown[] so the drawer stays
  // runtime-neutral and never decodes shape.
  rawEvents?: unknown[];
  // PR2: optional execution profile (cpu/cuda/rocm/vulkan/metal/mixed/unknown)
  // surfaced by RuntimeMetricsHud. Today still undefined for all call-sites.
  executionProfile?: ExecutionProfile;
  // PR2: when true (default) render the bottleneck breakdown bar +
  // stage timeline below the live answer once the run completes. Disable
  // for embedded surfaces where the extra vertical space is unwelcome.
  showBottleneck?: boolean;
};

// Visible reasoning panel. Same behaviour as StreamThinkingPanel today; adds
// an onToggle callback so PR2 can wire user-controlled reveal/hide.
export type VisibleReasoningPanelProps = {
  reasoning: string;
  visibility?: AiReasoningVisibility;
  className?: string;
  // PR2 — fires when the user expands/collapses the native <details>. Hosts
  // can persist the open state across runtime stages.
  onToggle?: (isOpen: boolean) => void;
};

// Runtime-neutral metrics HUD. Accepts either the existing StreamMetrics
// (PR1) or the broader RuntimeProgressMetrics shape (PR2) — only the legacy
// StreamMetrics path is exercised today; the second path compiles but is
// unused until PR2 wires the local runtime feed.
export type RuntimeMetricsHudProps = {
  metrics: StreamMetrics | RuntimeProgressMetrics | null;
  usage: StreamUsage | null;
  executionProfile?: ExecutionProfile;
  className?: string;
};

// Dev-only raw events drawer. Renders a collapsible JSON dump of the last 50
// events with a per-row copy button. Kept runtime-neutral: events are
// `unknown[]` so the drawer never decodes the payload shape.
export type RuntimeRawEventsDrawerProps = {
  events: unknown[];
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  className?: string;
};

// PR2: vertical timeline of completed runtime stages. Each row maps to an
// AiStreamStage value present in `stageTimings`, with the currently-active
// stage rendered with a pulsing dot. Stages without an `endedAtMs` are
// considered active; everything else is completed.
export type RuntimeStageTimelineProps = {
  className?: string;
  stageTimings?: StreamStageTimings | null;
  activeStage?: AiStreamStage;
};

// PR2: horizontal stacked bar showing modelLoadMs / promptEvalMs /
// generationMs as proportional colored segments with their absolute
// duration label underneath. Renders nothing when stageTimings is null or
// every duration is zero.
export type RuntimeBottleneckBreakdownProps = {
  className?: string;
  stageTimings?: StreamStageTimings | null;
  metrics?: StreamMetrics | null;
};

// PR3: image-generation step-by-step sampling progress panel. Reads the
// latest ClawRuntimeProgressEnvelope surfaced over the same SSE channel
// the lifecycle status flows on, and renders steps + ETA + optional
// preview frame + an interrupt button.
export type ImageGenerationProgressPanelProps = {
  className?: string;
  progress: ClawRuntimeProgressEnvelope | null;
  onCancel?: () => void;
  isCancelling?: boolean;
  /** Used as the alt-text for any rendered preview frame. */
  prompt?: string;
};

// Floating "Jump to latest" pill rendered over the chat scroll container while
// the user has scrolled away from the bottom. Clicking it pins the viewport to
// the latest content and re-enables the sticky-bottom auto-follow behaviour
// driven by useStickyBottomScroll.
//
// `unreadCount` (Phase 4 — chat UI/UX refactor) shows a numeric badge for
// messages that arrived while the user was reading older history. When
// undefined or 0, no badge is rendered.
export type JumpToLatestButtonProps = {
  visible: boolean;
  onClick: () => void;
  t: TranslateFunction;
  unreadCount?: number;
};

export type ModelSelection = {
  provider: string;
  model: string;
  displayName: string;
  specifications?: string[];
};

// Normalized shape the shared searchable ModelPicker renders — every one of
// the 6 model-picker call sites (grouped ModelSelection[] or flat
// JudgeModelOption[]) adapts its own data into this before rendering, then
// decodes ModelPickerOption.value back into its own callback shape.
export type ModelPickerOption = {
  value: string;
  label: string;
  specifications?: string[];
};

export type ModelPickerGroup = {
  key: string;
  label: string;
  options: ModelPickerOption[];
};

export type ModelPickerItemProps = {
  option: ModelPickerOption;
  isSelected: boolean;
  onSelect: (value: string) => void;
};

export type ModelPickerProps = {
  id?: string;
  groups: ModelPickerGroup[];
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  isLoading?: boolean;
  // A pinned, always-first option outside every group (e.g. "Auto (routing
  // decides)"). Omit for pickers that require an explicit model (no auto).
  autoOption?: ModelPickerOption;
  placeholder: string;
  loadingPlaceholder: string;
  emptyPlaceholder: string;
  searchPlaceholder: string;
  noResultsLabel: string;
  triggerClassName?: string;
  ariaLabel?: string;
  // Keeps the selected label available to a screen reader while removing it
  // from the trigger. An icon-only trigger has no room for it, and rendering it
  // anyway wrapped the model name one syllable per line beside the button.
  hideTriggerLabel?: boolean;
};

export type ModelSelectorProps = {
  value: ModelSelection | null;
  onChange: (selection: ModelSelection | null) => void;
  disabled?: boolean;
  // Phase 2 mobile composer redesign. `default` keeps the historical full-width
  // trigger (220–260px, label always visible). `compact` shrinks the trigger to
  // an icon-only button (h-8 w-8 rounded-xl) suitable for the mobile composer
  // top row; pass `showLabel` to render the selected model name beside the icon
  // even in compact mode (e.g. when there is room on tablet breakpoints).
  variant?: ComposerControlVariant;
  showLabel?: boolean;
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
  // Phase 2 mobile composer redesign — see ModelSelectorProps for the contract.
  // `compact` shrinks the trigger to a single 32px square icon button; passing
  // `showLabel` opts back into the "Attach files" text alongside the paperclip.
  variant?: ComposerControlVariant;
  showLabel?: boolean;
};

export type FileAttachmentRowProps = {
  file: UploadedFile;
  checked: boolean;
  indented: boolean;
  onToggle: (fileId: string, checked: boolean) => void;
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
  threadId?: string | null;
};

// Shared rich prompt textarea used by both the main chat MessageComposer and
// the in-thread compare panel. Wraps shadcn <Textarea> with auto-resize,
// Enter-to-submit (Shift+Enter for newline), and IME-safe composition handling.
export type RichPromptTextareaProps = {
  value: string;
  onChange: (next: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  minRows?: number;
  maxRows?: number;
  ariaLabel?: string;
  className?: string;
};

// Reusable wrapper that adds clipboard-paste + drag-and-drop file ingestion to
// any composer surface. Renders its children, listens for paste/drop anywhere
// inside, shows a drag overlay, and forwards captured files to `onFiles`. The
// host owns the actual upload-and-attach via useComposerAttachments.
export type ComposerDropzoneProps = {
  onFiles: (files: FileList | File[]) => void;
  disabled?: boolean;
  className?: string;
  overlayLabel?: string;
  children: React.ReactNode;
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
  // Optional search query; when present, occurrences inside the title are
  // wrapped in `<mark>` via the `HighlightedText` primitive.
  searchQuery?: string;
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

// Strict pure-render props for VirtualizedMessages. After the strict-TSX
// refactor (2026-05-31) the component takes a flat prop bag produced by
// useVirtualizedMessagesController so the .tsx file calls ZERO hooks.
//
// The header / footer / item render callbacks are produced by the controller
// hook (which delegates to the three new pure sub-components) so the .tsx
// only forwards them as-is to Virtuoso.
export type VirtualizedMessagesProps = {
  // Display states the .tsx renders directly.
  isLoading: boolean;
  isEmpty: boolean;
  /**
   * Null unless the last send was refused by a plan limit.
   *
   * The footer carries this too, but a thread with no messages never renders a
   * list — so on the very first message, the most likely moment to hit a wall,
   * the refusal had nowhere to appear and survived only as a toast.
   */
  limitNotice: ChatLimitNotice | null;
  loadingLabel: string;
  emptyLabel: string;
  persistentError: string | null;
  // Virtuoso wiring (controller-owned).
  virtuosoRef: React.Ref<VirtuosoHandle>;
  /** Scrolls to a message by id; silent when it is outside the loaded window. */
  handleJumpToMessage: (messageId: string) => boolean;
  renderItems: MessageRenderItem[];
  itemContent: (index: number, item: MessageRenderItem) => React.ReactElement;
  headerContent: () => React.ReactElement | null;
  footerContent: () => React.ReactElement | null;
  handleFollowOutput: FollowOutputCallback;
  onAtBottomStateChange: (atBottom: boolean) => void;
  handleStartReached: () => void;
  firstItemIndex: number;
  initialTopMostItemIndex: number;
  increaseViewportBy: { top: number; bottom: number };
  // Jump-to-latest pill. `unreadCount` (Phase 4) surfaces a badge when new
  // assistant messages arrived while the user was reading older history.
  showJumpToLatest: boolean;
  onJumpToLatest: () => void;
  unreadCount?: number;
  t: TranslateFunction;
};

// Pure-render props for the new VirtualizedMessageItem (single row).
export type VirtualizedMessageItemProps = {
  item: MessageRenderItem;
  onFeedback?: (messageId: string, feedback: MessageFeedback | null) => void;
  onRegenerate?: (messageId: string) => void;
  t: TranslateFunction;
};

// Pure-render props for the header banner that fronts the Virtuoso list.
// Either renders a "loading older" spinner or a "beginning of conversation"
// marker depending on the infinite-query state.
export type VirtualizedMessagesHeaderProps = {
  isFetchingPreviousPage: boolean;
  hasPreviousPage: boolean;
  t: TranslateFunction;
};

// Pure-render props for the footer wrapper around ThinkingIndicator.
export type VirtualizedMessagesFooterProps = {
  /** Null unless the last send was refused by a plan limit. */
  limitNotice: ChatLimitNotice | null;
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

// One of the four date buckets the chat thread list groups threads into.
// Used by `groupThreadsByDate` and the `GroupedThreadList` component.
export type ThreadDateGroupId = ThreadDateGroup;

export type ThreadDateGroupBucket = {
  id: ThreadDateGroup;
  threads: ChatThread[];
};

// Segment of a string after `splitHighlightSegments` has scanned for a search
// needle. Renderers wrap segments where `isMatch=true` in `<mark>`. `start`
// is the segment's byte offset inside the original haystack — used by
// `HighlightedText` as a stable, collision-free React key.
export type HighlightSegment = {
  start: number;
  text: string;
  isMatch: boolean;
};

export type HighlightedTextProps = {
  text: string;
  query: string;
  className?: string;
};

export type ThreadListDrawerProps = {
  /** Accessible name for the trigger and the sheet title. */
  label: string;
};

export type GroupedThreadListProps = {
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

// A single suggested-prompt button rendered in the empty-state of the chat
// thread list. Clicking the button creates a new thread seeded with `prompt`.
export type SuggestedPrompt = {
  id: string;
  label: string;
  prompt: string;
};

export type SuggestedPromptsProps = {
  prompts: SuggestedPrompt[];
  onSelect: (prompt: SuggestedPrompt) => void;
  disabled?: boolean;
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
  activeTab: ChatThreadListTab;
  setActiveTab: (tab: ChatThreadListTab) => void;
  handleNewChat: () => void;
  handleSuggestedPrompt: (prompt: SuggestedPrompt) => void;
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

export type ConnectorFormFieldsProps = {
  fieldErrors: ConnectorFormFieldErrors;
  isEditing: boolean;
  name: string;
  setName: (value: string) => void;
  provider: ConnectorProvider | null;
  setProvider: (value: ConnectorProvider) => void;
  authType: ConnectorAuthType;
  setAuthType: (value: ConnectorAuthType) => void;
  apiKey: string;
  setApiKey: (value: string) => void;
  baseUrl: string;
  setBaseUrl: (value: string) => void;
  region: string;
  setRegion: (value: string) => void;
  defaultBaseUrl: string | null;
};

export type ModelTableProps = {
  models: ConnectorModel[];
  showProvider?: boolean;
  emptyMessage?: string;
  // Multi-select for compare. When `compareSelection` is supplied, the table
  // renders a leading checkbox column and `onToggleCompare(modelId)` is fired
  // when the user toggles a row. When omitted, the table renders unchanged.
  compareSelection?: ReadonlySet<string>;
  onToggleCompare?: (modelId: string) => void;
};

export type ModelCardProps = {
  model: ConnectorModel;
  // Optional compare-mode selection. When `selected` is `true` the card is
  // visually highlighted; clicking the card toggles selection. When both
  // props are omitted, the card is purely presentational.
  selected?: boolean;
  onToggleSelect?: (modelId: string) => void;
};

export type ModelCardGridProps = {
  models: ConnectorModel[];
  emptyMessage?: string;
  compareSelection?: ReadonlySet<string>;
  onToggleCompare?: (modelId: string) => void;
};

export type ModelViewToggleProps = {
  value: ModelCatalogViewMode;
  onChange: (mode: ModelCatalogViewMode) => void;
};

// A single active filter chip rendered above the table/grid. Clicking the
// "X" inside the pill clears just that filter (calls `onClear`).
export type ActiveFilterPill = {
  id: string;
  label: string;
  onClear: () => void;
};

export type ModelFilterPillsProps = {
  pills: ActiveFilterPill[];
  onClearAll: () => void;
};

export type ModelCompareToolbarProps = {
  selectedCount: number;
  // Optional list of selected model display labels for the toolbar copy.
  selectedLabels: string[];
  onClear: () => void;
  onCompare: () => void;
  // True when the user has flipped on compare mode but has selected fewer
  // than two models. The "Compare" CTA is disabled in that state.
  canCompare: boolean;
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

export type ContextPackItemRowProps = {
  item: ContextPackItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isDragSupported: boolean;
  isDragging: boolean;
  isDragTarget: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isUpdatePending: boolean;
  isRemovePending: boolean;
};

export type ContextPackListGridProps = {
  packs: ContextPack[];
  onSelectPack: (id: string) => void;
};

export type ContextPackItemListProps = {
  items: ContextPackItem[];
  isDragSupported: boolean;
  onReorder: (itemId: string, newSortOrder: number) => void;
  onRemove: (itemId: string) => void;
  isUpdatePending: boolean;
  isRemovePending: boolean;
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

export type RecentAuditEventsListProps = {
  events: AuditLog[];
};

export type RecentAuditEventsBodyProps = {
  isLoading: boolean;
  isError: boolean;
  events: AuditLog[];
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
  plans: PlanView[];
  actor: AdminUserActor | null;
  pendingId: string | null;
  onChangeRole: (userId: string, role: string) => void;
  onDeactivate: (userId: string) => void;
  onReactivate: (userId: string) => void;
  onActivate: (userId: string) => void;
  onAssignPlan: (userId: string, planId: string) => void;
  onUpdateUser: (userId: string, data: AdminUserUpdateRequest) => void;
  onTemporaryPassword: (userId: string) => void;
  isRoleChangePending: boolean;
  isDeactivatePending: boolean;
  isReactivatePending: boolean;
  isActivatePending: boolean;
  isAssignPlanPending: boolean;
  isUpdateUserPending: boolean;
  isTemporaryPasswordPending: boolean;
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

// Sibling of CompareJudgeControls. The critic is a second-pass review surfaced
// in the Judge Review modal. The user-supplied model is encoded the same way
// the judge picker encodes its selection — `PROVIDER:model` for cloud, plain
// model name for local — and parsed by the backend via parseJudgeModel.
// Action bar for a single compare panel. Rendered at BOTH ends of the card so
// the controls are reachable without scrolling past a long response.
export type CompareResultActionsProps = {
  isMarkdown: boolean;
  copied: boolean;
  onToggleViewMode: () => void;
  onCopy: () => void;
  onExport: () => void;
  onExpand: () => void;
  className?: string;
  t: TranslateFunction;
};

export type CompareCriticControlsProps = {
  criticEnabled: boolean;
  onCriticEnabledChange: (value: boolean) => void;
  criticModel: string | null;
  onCriticModelChange: (value: string | null) => void;
  criticModelOptions: JudgeModelOption[];
  criticModelOptionsLoading: boolean;
  criticEnablementDisabled?: boolean;
  t: TranslateFunction;
};

export type CompareResearchModeControlProps = {
  value: CompareResearchMode;
  onChange: (value: CompareResearchMode) => void;
  t: TranslateFunction;
  // When true, dim the control. Useful for plan-gating ("Web research is
  // locked on your plan"). The wrapper renders the `lockedTooltipKey`
  // (e.g. `research.toggle.lockedUpgrade`) as a native `title` tooltip.
  disabled?: boolean;
  lockedTooltipKey?: string;
};

export type ParallelResponseCardProps = {
  response: ParallelModelResponse;
  isFastest: boolean;
  t: TranslateFunction;
};

export type ParallelResultsGridProps = {
  messages: ChatMessage[];
  prompt?: string;
  t: TranslateFunction;
};

export type UpgradeCtaBannerProps = {
  // The locked plan feature the user tried to use (judge, critic, research).
  // The banner localizes a human-friendly feature label off this value.
  feature: PlanFeature;
  // Pure-render callback fired when the user clicks the dismiss button. The
  // page hook owns the dismissal state.
  onDismiss: () => void;
  t: TranslateFunction;
};

export type CompareResultCardProps = {
  response: ParallelModelResponse;
  isFastest: boolean;
  isBest: boolean;
  t: TranslateFunction;
};

export type CompareJudgeBadgesProps = {
  judgeState: CompareJudgeState;
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModels: ParallelModelTarget[];
  onToggleModel: (provider: string, model: string, checked: boolean) => void;
  // Controlled prompt textarea. Wired to use-in-thread-compare's prompt /
  // setPrompt / handleSend trio so Enter-to-send + the Send button share state.
  prompt: string;
  onPromptChange: (value: string) => void;
  onSend: () => void;
  result: ParallelResponse | undefined;
  isPending: boolean;
  canSend: boolean;
  judgeEnabled: boolean;
  onJudgeEnabledChange: (value: boolean) => void;
  judgeModel: string | null;
  onJudgeModelChange: (value: string | null) => void;
  judgeModelOptions: JudgeModelOption[];
  judgeModelOptionsLoading: boolean;
  criticEnabled: boolean;
  onCriticEnabledChange: (value: boolean) => void;
  criticModel: string | null;
  onCriticModelChange: (value: string | null) => void;
  researchMode: CompareResearchMode;
  onResearchModeChange: (value: CompareResearchMode) => void;
  // Plan-feature gates: hide judge / critic / research controls when the
  // user's plan does not unlock them. ADMIN passes true via usePlanFeatures.
  allowJudgeMode: boolean;
  allowCriticReview: boolean;
  allowResearchMode: boolean;
  // Compare-mode file attachments. Threaded into the parallel send payload
  // as `fileIds`. The picker mirrors the main composer's attachment UX.
  selectedFileIds: string[];
  onSelectedFileIdsChange: (ids: string[]) => void;
  // Paste/drop ingestion for the compare prompt area (upload-and-attach).
  onIngestFiles: (files: FileList | File[]) => void;
  t: TranslateFunction;
};

// ─── Chat thread page shell ─────────────────────────────────────────────────

// Single flat prop bag the page TSX spreads onto <ChatThreadShell />. Built
// by useThreadDetailPage (the lone controller hook the page is allowed to
// call). The shell renders header / in-thread compare / thread settings /
// virtualized messages / composer — all stateless, props-driven.
export type ChatThreadShellProps = {
  // Bootstrap.
  threadId: string;
  isLoadingPlaceholder: boolean;
  loadingLabel: string;
  // Header.
  title: string;
  thread: ChatThread | null;
  /** Downloads the conversation as Markdown; disabled while it is empty. */
  onExportThread: () => void;
  canExportThread: boolean;
  exportThreadLabel: string;
  /** Accessible name for the mobile thread-list drawer. */
  threadListDrawerLabel: string;
  /** Find-in-conversation state, with jump-to. */
  search: UseInThreadSearchReturn;
  searchLabel: string;
  /** Scrolls to a search hit, or says why it cannot reach one. */
  onJumpToMessage: (messageId: string) => void;
  editableTitle: UseEditableTitleReturn;
  canCompare: boolean;
  compareToggleOpen: () => void;
  compareIsOpen: boolean;
  // Dialog-driven close (X / Escape / overlay click) for each of the three
  // mutually-exclusive header panels — only one of compare / quality /
  // thread-settings can be open at a time (see useThreadDetailPage).
  compareOnOpenChange: (open: boolean) => void;
  threadSettingsOpen: boolean;
  threadSettingsToggleOpen: () => void;
  threadSettingsOnOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  handleDelete: () => void;
  // Delete-confirmation dialog state (data-loss guard for thread deletion).
  deleteConfirmOpen: boolean;
  openDeleteConfirm: () => void;
  setDeleteConfirmOpen: (open: boolean) => void;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  cancelLabel: string;
  backToThreadsHref: string;
  backToThreadsLabel: string;
  threadSettingsLabel: string;
  deleteLabel: string;
  compareLabel: string;
  canUseQualityControls: boolean;
  qualityControlsOpen: boolean;
  qualityControlsToggleOpen: () => void;
  qualityControlsOnOpenChange: (open: boolean) => void;
  qualityControlsLabel: string;
  // Public-share management: header entry point + its dialog.
  shareButtonProps: ShareChatButtonProps;
  shareDialogProps: ShareChatDialogProps;
  // In-thread compare dialog (mounted when canCompare; its own `open` prop
  // gates visibility). Mutually exclusive with the quality/settings dialogs.
  inThreadComparePanelProps: InThreadComparePanelProps;
  // Thread settings dialog (mounted unconditionally; `open` gates visibility).
  threadSettingsProps: ThreadSettingsProps;
  threadQualityPanelProps: ThreadQualityPanelProps;
  // Virtualized messages.
  virtualizedMessagesProps: VirtualizedMessagesProps;
  // Composer + resize handle.
  composerHeight: number;
  onResizeHandleMouseDown: (e: React.MouseEvent) => void;
  resizeAriaLabel: string;
  composerProps: MessageComposerProps;
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

export type RecoveryFallbackTableProps = {
  recentFallbacks: RecentFallback[];
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

// Props for the small N-candidate count selector rendered inside the
// Best-of-N orchestration shell's `extraFieldsSlot`. Extracted from the
// page TSX so the page stays render-only and the selector can be unit
// tested in isolation.
export type BestOfNCountSelectorProps = {
  value: number;
  onChange: (next: number) => void;
  disabled: boolean;
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

export type SharedConnectorsSectionProps = {
  connectors: SharedConnectorView[];
  isLoading: boolean;
  isError: boolean;
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

// Dashboard sub-component props — extracted per the no-inline-subcomponent
// rule in rules/03-frontend-rules.md.
export type DashboardHeroProps = {
  greetingKey: DashboardGreetingKey;
  greetingName: string;
  operationalState: DashboardOperationalState;
};

export type DashboardStatCardProps = {
  card: DashboardStatCard;
  isLoading: boolean;
};

export type DashboardQuickActionCardProps = {
  action: DashboardQuickAction;
};

export type DashboardSystemHealthCardProps = {
  healthStatus: HealthStatus | null;
  healthServices: AggregatedHealth['services'];
  healthSummary: AggregatedHealth['summary'] | null;
  isLoading: boolean;
};

// Contact page — success confirmation panel props.
export type ContactSuccessProps = {
  title: string;
  body: string;
  resetLabel: string;
  onReset: () => void;
};

// Group heading inside a Select dropdown. `className` stays open so a caller
// can adjust spacing for an unusually dense list without forking the styling.
export type SelectGroupHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

// ─── Public chat-share component props ──────────────────────────────────────

export type SharePublicationWarningProps = {
  headingLabel: string;
  /** Pre-translated consequence bullets, rendered verbatim in order. */
  bullets: ReadonlyArray<string>;
  acknowledgeLabel: string;
  hasAcknowledged: boolean;
  onToggleAcknowledged: () => void;
};

export type ShareIndexingControlProps = {
  label: string;
  description: string;
  allowIndexing: boolean;
  onToggle: () => void;
  isPending: boolean;
  /** Why the server would not honour indexing, or null when it did. */
  blockedReason: string | null;
  switchId: string;
};

export type PublicShareUrlFieldProps = {
  label: string;
  url: string;
  copyLabel: string;
  copiedLabel: string;
  openLabel: string;
  isCopied: boolean;
  onCopy: () => void;
};

export type PublicShareStatusProps = {
  visibilityLabel: string;
  visibilityTone: BadgeTone;
  snapshotLabel: string;
  lastUpdatedLabel: string;
  messageCountLabel: string;
  /** Set when the private thread has moved past the published snapshot. */
  unpublishedNotice: string | null;
};

export type ShareChatDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  error: string | null;
  /** null renders the pre-publication state. */
  share: OwnerChatShare | null;
  warningProps: SharePublicationWarningProps;
  urlFieldProps: PublicShareUrlFieldProps;
  indexingProps: ShareIndexingControlProps;
  statusProps: PublicShareStatusProps;
  confirmDialogProps: ConfirmDialogProps;
  publishLabel: string;
  refreshLabel: string;
  regenerateLabel: string;
  disableLabel: string;
  isPublishPending: boolean;
  isRefreshPending: boolean;
  isRegeneratePending: boolean;
  isRevokePending: boolean;
  onPublish: () => void;
  onRefresh: () => void;
  onRequestRegenerate: () => void;
  onRequestDisable: () => void;
};

export type ShareChatButtonProps = {
  label: string;
  /** Visually marks a thread that is already public. */
  isShared: boolean;
  onClick: () => void;
};

// ─── Public shared-chat page component props ────────────────────────────────

export type PublicSharedChatHeaderProps = {
  title: string;
  publishedLabel: string;
  updatedLabel: string;
  messageCountLabel: string;
  snapshotDisclaimer: string;
};

export type PublicSharedAssetsProps = {
  publicShareId: string;
  assets: PublicChatShareAsset[];
  /** Alt text for an image whose source turn carried none. */
  imageLabel: string;
};

export type PublicSharedMessageProps = {
  message: PublicChatShareMessage;
  /** Needed to build the share-scoped asset URLs. */
  publicShareId: string;
  imageLabel: string;
  roleLabel: string;
  /** Pre-formatted timestamp. Formatting on the server keeps SSR deterministic. */
  timestampLabel: string;
  modelLabel: string | null;
  /** Shown when the body hit the render cap. */
  truncatedLabel: string;
};

/**
 * The half of the message-list props the server view model can resolve on its
 * own: labels, formatters, and where the inline ad belongs.
 *
 * Split from the props proper so the view model can be built without knowing the
 * message array or holding a React node, and so the page supplies exactly the two
 * things only it has.
 */
export type PublicSharedMessageListPresentation = {
  userRoleLabel: string;
  assistantRoleLabel: string;
  truncatedLabel: string;
  /** 1-based message index after which the inline ad is placed, or null. */
  inlineAdAfterIndex: number | null;
  formatTimestamp: (iso: string) => string;
  formatModelLabel: (message: PublicChatShareMessage) => string | null;
};

export type PublicSharedMessageListProps = PublicSharedMessageListPresentation & {
  messages: PublicChatShareMessage[];
  /** Needed to build the share-scoped asset URLs. */
  publicShareId: string;
  /** Alt text for a published image whose source turn carried none. */
  imageLabel: string;
  /** Rendered between message groups when the page is ad-eligible. */
  inlineAd: React.ReactNode;
};

export type PublicMarkdownRendererProps = {
  content: string;
  truncatedLabel: string;
};

export type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  defaultCountryIso2?: string;
  countryLabel: string;
  countrySearchLabel: string;
  numberLabel: string;
  numberPlaceholder: string;
  invalidLabel?: string;
  disabled?: boolean;
};
export type PublicSharedChatFooterProps = {
  homeLabel: string;
  homeHref: string;
  reportLabel: string;
  reportHref: string;
  disclaimer: string;
};

export type PasswordInputProps = Omit<React.ComponentPropsWithoutRef<'input'>, 'type'> & {
  id: string;
};

export type ThreadSearchPanelProps = {
  search: UseInThreadSearchReturn;
  /** No-op when the message is outside the loaded window. */
  onJumpToMessage: (messageId: string) => void;
};

export type MessageReasoningPanelProps = {
  /** Already trimmed and known non-empty by getStoredReasoning. */
  reasoning: string;
};

export type ChatLimitNoticeCardProps = {
  notice: ChatLimitNotice;
};

export type PasswordStrengthMeterProps = {
  strength: PasswordStrengthResult;
  /** Hide the checklist when the field already passes, or when space is tight. */
  showRequirements?: boolean;
};

export type CreateUserDialogProps = {
  open: boolean;
  isSaving: boolean;
  /**
   * Only the super administrator may mint another administrator, so the ADMIN
   * option is withheld rather than offered and refused.
   */
  canCreateAdmin: boolean;
  onClose: () => void;
  onCreate: (data: AdminCreateUserRequest) => void;
  t: TranslateFunction;
};

export type EditUserDialogProps = {
  open: boolean;
  user: AdminUser | null;
  actor: AdminUserActor | null;
  isSaving: boolean;
  isRotating: boolean;
  onClose: () => void;
  onSave: (userId: string, data: AdminUserUpdateRequest) => void;
  onRotatePassword: (userId: string) => void;
  t: TranslateFunction;
};

/** One schematic beside an install step. */
export type CodingAgentInstallFigureProps = {
  /** Which illustration to draw; undefined when the step has none. */
  figure: CodingAgentInstallFigure | undefined;
  /** Accessible name — the step's own translated title. */
  label: string;
};
