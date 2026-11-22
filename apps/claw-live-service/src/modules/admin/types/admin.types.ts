import type { LiveMode, LiveRunStatus, LiveSourceKind } from '../../../generated/prisma';

export type AdminActiveRunView = {
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

export type AdminTotals = {
  activeRuns: number;
  activeViewers: number;
  runsFailed: number;
  delayedRuns: number;
};

export type AdminAiStats = {
  sttP50Ms: number | null;
  sttP95Ms: number | null;
  summaryP50Ms: number | null;
  summaryP95Ms: number | null;
  translationP95Ms: number | null;
  visionCalls: number;
  retryOrFailureRate: number;
  uncertainSegments: number;
};

export type AdminMoney = {
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

export type AdminOverviewView = {
  windowDays: number;
  activeRuns: AdminActiveRunView[];
  totals: AdminTotals;
  ai: AdminAiStats;
  money: AdminMoney;
};

/** One row of the per-stage latency aggregate. */
export type StageStatsRow = {
  stage: string;
  calls: number;
  failed: number;
  p50: number | null;
  p95: number | null;
};

export type MoneyAggregates = {
  providerCostMicroUsd: number;
  todayCostMicroUsd: number;
  revenueMicroUsd: number;
  freeSeconds: number;
  paidSeconds: number;
  graceSeconds: number;
  streamHours: number;
};

export type ActiveRunRow = {
  id: string;
  status: LiveRunStatus;
  mode: LiveMode;
  startedAt: Date;
  lastCommitAt: Date | null;
  failureCode: string | null;
  leaseOwner: string | null;
  stream: { sourceKind: LiveSourceKind; title: string | null };
};

export type RunStopView = { runId: string; status: LiveRunStatus };

export type RawStage = {
  stage: string;
  calls: number | bigint;
  failed: number | bigint;
  p50: number | null;
  p95: number | null;
};
export type RawMoney = {
  provider_cost: number | bigint | null;
  today_cost: number | bigint | null;
  revenue: number | bigint | null;
  free_seconds: number | bigint | null;
  paid_seconds: number | bigint | null;
  grace_seconds: number | bigint | null;
  stream_hours: number | null;
};
