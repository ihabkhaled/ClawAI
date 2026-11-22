import type {
  ActiveRunRow,
  AdminActiveRunView,
  AdminAiStats,
  AdminMoney,
  MoneyAggregates,
  StageStatsRow,
} from '../types/admin.types';
import {
  DAYS_PER_MONTH,
  SECONDS_PER_HOUR,
  STAGE_STT,
  STAGE_SUMMARY,
  STAGE_TRANSLATION,
  STAGE_VISION,
} from '../constants/admin.constants';

export function toActiveRunView(
  row: ActiveRunRow,
  viewers: number,
  nowMs: number,
): AdminActiveRunView {
  return {
    runId: row.id,
    sourceKind: row.stream.sourceKind,
    title: row.stream.title,
    status: row.status,
    mode: row.mode,
    viewers,
    startedAt: row.startedAt.toISOString(),
    lastCommitAt: row.lastCommitAt?.toISOString() ?? null,
    lagSeconds:
      row.lastCommitAt === null
        ? null
        : Math.max(0, Math.round((nowMs - row.lastCommitAt.getTime()) / 1000)),
    failureCode: row.failureCode,
    leaseOwner: row.leaseOwner,
  };
}

export function buildAiStats(stages: StageStatsRow[], uncertainSegments: number): AdminAiStats {
  const stage = (name: string): StageStatsRow | undefined =>
    stages.find((row) => row.stage === name);
  const calls = stages.reduce((sum, row) => sum + row.calls, 0);
  const failed = stages.reduce((sum, row) => sum + row.failed, 0);
  return {
    sttP50Ms: stage(STAGE_STT)?.p50 ?? null,
    sttP95Ms: stage(STAGE_STT)?.p95 ?? null,
    summaryP50Ms: stage(STAGE_SUMMARY)?.p50 ?? null,
    summaryP95Ms: stage(STAGE_SUMMARY)?.p95 ?? null,
    translationP95Ms: stage(STAGE_TRANSLATION)?.p95 ?? null,
    visionCalls: stage(STAGE_VISION)?.calls ?? 0,
    retryOrFailureRate: calls === 0 ? 0 : failed / calls,
    uncertainSegments,
  };
}

function perHour(microUsd: number, hours: number): number {
  return hours > 0 ? Math.round(microUsd / hours) : 0;
}

export function buildMoney(
  money: MoneyAggregates,
  windowDays: number,
  dailyBudgetMicroUsd: number,
): AdminMoney {
  const viewerHours =
    (money.freeSeconds + money.paidSeconds + money.graceSeconds) / SECONDS_PER_HOUR;
  return {
    providerCostMicroUsd: money.providerCostMicroUsd,
    revenueMicroUsd: money.revenueMicroUsd,
    grossMarginMicroUsd: money.revenueMicroUsd - money.providerCostMicroUsd,
    costPerStreamHourMicroUsd: perHour(money.providerCostMicroUsd, money.streamHours),
    costPerViewerHourMicroUsd: perHour(money.providerCostMicroUsd, viewerHours),
    freeSecondsConsumed: money.freeSeconds,
    paidSeconds: money.paidSeconds,
    projectedMonthlyCostMicroUsd: Math.round(
      (money.providerCostMicroUsd / windowDays) * DAYS_PER_MONTH,
    ),
    budgetUsedPercentToday:
      dailyBudgetMicroUsd > 0
        ? Math.round((money.todayCostMicroUsd / dailyBudgetMicroUsd) * 1000) / 10
        : 0,
  };
}

/** Midnight UTC of the day containing `nowMs`. */
export function startOfUtcDay(nowMs: number): Date {
  const date = new Date(nowMs);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
