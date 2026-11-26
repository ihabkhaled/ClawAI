import type { LiveModelChainDirection, LiveModelChainKind } from '@/enums/live-model-chain.enum';
import type {
  LivePlatform,
  LivePlanField,
  LivePolicyFlag,
  LiveMode,
  LivePolicyNumberField,
  LiveRunStatus,
  LiveSourceKind,
} from '@/enums/live.enum';
import type { ModelPickerGroup } from '@/types/component.types';
import type { TranslateFunction } from '@/types/i18n.types';

/** Mirrors claw-live-service `livePlanPolicySchema`. Money is integer micro-USD. */
export type LivePlanPolicy = {
  freeSecondsPerMonth: number;
  paidMicroUsdPerMinute: number;
};

export type LiveModelRef = { connector: string; model: string; style: string };

/** Mirrors claw-live-service `livePolicySchema` (LivePolicyVersion.config). */
export type LivePolicyConfig = {
  featureEnabled: boolean;
  killSwitch: boolean;
  plans: Record<string, LivePlanPolicy>;
  defaultPlan: LivePlanPolicy;
  visionBilling: string;
  graceSeconds: number;
  maxActiveStreams: number;
  maxSessionsPerUser: number;
  sessionsPerUserPerHour: number;
  dailyBudgetMicroUsd: number;
  budgetSoftStopPercent: number;
  summaryModelChain: LiveModelRef[];
  visionModelChain: LiveModelRef[];
  /** 1..3 extra agents that each draft; the main model merges. Absent before 2026-11-26 (one default agent). */
  councilModelChain?: LiveModelRef[];
  /** Platforms ClawAI's server reads itself (all but Discord). Absent on a version saved before it existed. */
  serverPullPlatforms?: LiveServerPullPlatform[];
  /** Longest recorded video the server plays along, in seconds (0 = off). Kept as loaded; absent = 3 hours. */
  recordedVideoMaxSeconds?: number;
};

/** A platform server pull may read: every platform but Discord (no public link). */
export type LiveServerPullPlatform = Exclude<LivePlatform, LivePlatform.DISCORD>;

/** One `LivePolicyVersion` row as the admin API returns it (GET list, PUT and rollback answer). */
export type LivePolicyVersion = {
  version: number;
  active: boolean;
  config: LivePolicyConfig;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

/** `GET /admin/policy`: the active version (null before the seed) plus recent versions, newest first. */
export type LiveAdminPolicy = {
  active: LivePolicyVersion | null;
  versions: LivePolicyVersion[];
};

/** `note` is omitted when blank: the server requires 1..500 characters when present. */
export type LiveAdminSavePolicyInput = { config: LivePolicyConfig; note: string };

export type LiveAdminRun = {
  runId: string;
  sourceKind: LiveSourceKind;
  title: string | null;
  status: LiveRunStatus;
  mode: LiveMode;
  viewers: number;
  startedAt: string;
  lastCommitAt: string | null;
  lagSeconds: number | null;
  failureCode: string | null;
  leaseOwner: string | null;
};

export type LiveAdminTotals = {
  activeRuns: number;
  activeViewers: number;
  runsFailed: number;
  delayedRuns: number;
};

export type LiveAdminAiStats = {
  sttP50Ms: number | null;
  sttP95Ms: number | null;
  summaryP50Ms: number | null;
  summaryP95Ms: number | null;
  translationP95Ms: number | null;
  visionCalls: number;
  retryOrFailureRate: number;
  uncertainSegments: number;
};

/** Money is integer micro-USD. */
export type LiveAdminMoney = {
  providerCostMicroUsd: number;
  revenueMicroUsd: number;
  grossMarginMicroUsd: number;
  costPerStreamHourMicroUsd: number;
  costPerViewerHourMicroUsd: number;
  freeSecondsConsumed: number;
  paidSeconds: number;
  projectedMonthlyCostMicroUsd: number;
  budgetUsedPercentToday: number;
};

/** `GET /admin/overview?days=1|7|30`. */
export type LiveAdminOverview = {
  windowDays: number;
  activeRuns: LiveAdminRun[];
  totals: LiveAdminTotals;
  ai: LiveAdminAiStats;
  money: LiveAdminMoney;
};

/** `POST /admin/runs/:runId/stop` response. */
export type LiveAdminRunStop = { runId: string; status: LiveRunStatus };

export type LivePlanFormRow = { plan: string; freeMinutes: string; paidUsdPerMinute: string };

/** What the admin edits: minutes instead of seconds, dollars instead of micro-USD, text for numbers. */
export type LivePolicyFormValues = {
  featureEnabled: boolean;
  killSwitch: boolean;
  serverPull: boolean;
  plans: LivePlanFormRow[];
  defaultPlan: LivePlanFormRow;
  graceSeconds: string;
  maxActiveStreams: string;
  maxSessionsPerUser: string;
  sessionsPerUserPerHour: string;
  dailyBudgetUsd: string;
  budgetSoftStopPercent: string;
  modelChains: LiveModelChains;
  note: string;
};

/** `config` when every field is valid, else the first invalid field (`plans.<plan>.<field>` for a plan row). */
export type LivePolicyFormResult = { config: LivePolicyConfig | null; invalidField: string | null };

export type UseAdminLivePolicyFormResult = {
  values: LivePolicyFormValues | null;
  invalidField: string | null;
  setFlag: (field: LivePolicyFlag, value: boolean) => void;
  setNumber: (field: LivePolicyNumberField, value: string) => void;
  setPlan: (plan: string, field: LivePlanField, value: string) => void;
  setNote: (value: string) => void;
  chainActions: UseAdminLiveModelChainActionsResult;
  build: () => LivePolicyFormResult | null;
};

export type UseAdminLivePolicyResult = {
  policy: LiveAdminPolicy | null;
  /** The active version the editor is seeded from. */
  activePolicy: LivePolicyVersion | null;
  isPolicyLoading: boolean;
  isPolicyError: boolean;
  form: UseAdminLivePolicyFormResult;
  isSaving: boolean;
  save: () => void;
  rollbackVersion: number | null;
  isRollingBack: boolean;
  askRollback: (version: number | null) => void;
  confirmRollback: () => void;
};

export type UseAdminLiveResult = UseAdminLivePolicyResult &
  UseAdminLiveModelOptionsResult & {
    t: TranslateFunction;
    locale: string;
    days: number;
    setDays: (days: number) => void;
    overview: LiveAdminOverview | null;
    isOverviewLoading: boolean;
    isOverviewError: boolean;
    retryOverview: () => void;
    stopRunId: string | null;
    pendingRunId: string | null;
    askStopRun: (id: string | null) => void;
    confirmStopRun: () => void;
  };

export type AdminLiveSectionProps = { controller: UseAdminLiveResult };

export type AdminLiveNumberFieldProps = {
  id: string;
  label: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
};

export type AdminLivePlanRowProps = {
  row: LivePlanFormRow;
  label: string;
  invalidField: string | null;
  t: TranslateFunction;
  onChange: (plan: string, field: LivePlanField, value: string) => void;
};

/** One chain editor on the policy form, with the live-service schema's length limits. */
export type LiveModelChainEditorOption = {
  kind: LiveModelChainKind;
  min: number;
  max: number;
  titleKey: string;
  hintKey: string;
  addKey: string;
};

/** The three chains as the form edits them. */
export type LiveModelChains = Record<LiveModelChainKind, LiveModelRef[]>;

export type UseAdminLiveModelChainActionsResult = {
  setChainModel: (kind: LiveModelChainKind, index: number, value: string | null) => void;
  moveChainRow: (
    kind: LiveModelChainKind,
    index: number,
    direction: LiveModelChainDirection,
  ) => void;
  removeChainRow: (kind: LiveModelChainKind, index: number) => void;
  addChainRow: (kind: LiveModelChainKind) => void;
};

export type UseAdminLiveModelOptionsResult = {
  /** The chat picker's catalogue; providers Live cannot call are shown disabled with the reason. */
  modelGroups: ModelPickerGroup[];
  isModelsLoading: boolean;
};

export type AdminLiveModelChainProps = {
  editor: LiveModelChainEditorOption;
  chain: LiveModelRef[];
  groups: ModelPickerGroup[];
  isLoading: boolean;
  invalid: boolean;
  t: TranslateFunction;
  actions: UseAdminLiveModelChainActionsResult;
};

export type AdminLiveModelChainRowProps = {
  editor: LiveModelChainEditorOption;
  index: number;
  count: number;
  value: string;
  groups: ModelPickerGroup[];
  isLoading: boolean;
  t: TranslateFunction;
  actions: UseAdminLiveModelChainActionsResult;
};
