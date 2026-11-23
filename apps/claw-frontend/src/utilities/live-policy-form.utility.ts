import { LIVE_SECONDS_PER_MINUTE, LIVE_SERVER_PULL_PLATFORMS } from '@/constants/live.constants';
import { LivePlanField, LivePolicyNumberField } from '@/enums/live.enum';
import type {
  LivePlanFormRow,
  LivePlanPolicy,
  LivePolicyConfig,
  LivePolicyFormResult,
  LivePolicyFormValues,
} from '@/types/live-admin.types';
import { microUsdToUsdInput, usdInputToMicroUsd } from '@/utilities/micro-usd-input.utility';

const WHOLE_NUMBER_PATTERN = /^\d+$/u;

/** Seconds as the minutes an admin edits; fractional minutes stay exact (90 s → "1.5"). */
export function liveSecondsToMinutesInput(seconds: number): string {
  return String(seconds / LIVE_SECONDS_PER_MINUTE);
}

/** Typed minutes as whole seconds, or null when not a non-negative number. */
export function liveMinutesInputToSeconds(value: string): number | null {
  const trimmed = value.trim();
  const [whole = '', fraction, ...rest] = trimmed.split('.');
  const fractionValid = fraction === undefined || WHOLE_NUMBER_PATTERN.test(fraction);
  if (rest.length > 0 || !WHOLE_NUMBER_PATTERN.test(whole) || !fractionValid) {
    return null;
  }
  const seconds = Math.round(Number(trimmed) * LIVE_SECONDS_PER_MINUTE);
  return Number.isSafeInteger(seconds) ? seconds : null;
}

export function liveWholeNumberInput(value: string): number | null {
  const trimmed = value.trim();
  if (!WHOLE_NUMBER_PATTERN.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function planToRow(plan: string, policy: LivePlanPolicy): LivePlanFormRow {
  return {
    plan,
    freeMinutes: liveSecondsToMinutesInput(policy.freeSecondsPerMonth),
    paidUsdPerMinute: microUsdToUsdInput(policy.paidMicroUsdPerMinute),
  };
}

export function livePolicyToFormValues(config: LivePolicyConfig): LivePolicyFormValues {
  return {
    featureEnabled: config.featureEnabled,
    killSwitch: config.killSwitch,
    // A version saved before server pull existed has no list: the server's default (all platforms) applies.
    serverPull: (config.serverPullPlatforms ?? LIVE_SERVER_PULL_PLATFORMS).length > 0,
    plans: Object.entries(config.plans).map(([plan, policy]) => planToRow(plan, policy)),
    defaultPlan: planToRow('', config.defaultPlan),
    graceSeconds: String(config.graceSeconds),
    maxActiveStreams: String(config.maxActiveStreams),
    maxSessionsPerUser: String(config.maxSessionsPerUser),
    sessionsPerUserPerHour: String(config.sessionsPerUserPerHour),
    dailyBudgetUsd: microUsdToUsdInput(config.dailyBudgetMicroUsd),
    budgetSoftStopPercent: String(config.budgetSoftStopPercent),
    note: '',
  };
}

function rowToPlan(row: LivePlanFormRow): LivePlanPolicy | string {
  const freeSecondsPerMonth = liveMinutesInputToSeconds(row.freeMinutes);
  if (freeSecondsPerMonth === null) {
    return LivePlanField.FREE_MINUTES;
  }
  const paidMicroUsdPerMinute = usdInputToMicroUsd(row.paidUsdPerMinute);
  if (paidMicroUsdPerMinute === null || paidMicroUsdPerMinute === undefined) {
    return LivePlanField.PAID_USD_PER_MINUTE;
  }
  return { freeSecondsPerMonth, paidMicroUsdPerMinute };
}

/**
 * Form values back to the stored policy: minutes → seconds, dollars → integer micro-USD.
 * Model chains and vision billing are not edited here, so they are carried over from `base`.
 */
export function liveFormValuesToPolicy(
  values: LivePolicyFormValues,
  base: LivePolicyConfig,
): LivePolicyFormResult {
  const plans: Record<string, LivePlanPolicy> = {};
  for (const row of values.plans) {
    const plan = rowToPlan(row);
    if (typeof plan === 'string') {
      return { config: null, invalidField: `plans.${row.plan}.${plan}` };
    }
    plans[row.plan] = plan;
  }
  const defaultPlan = rowToPlan(values.defaultPlan);
  if (typeof defaultPlan === 'string') {
    return { config: null, invalidField: `plans..${defaultPlan}` };
  }
  const wholeFields = [
    LivePolicyNumberField.GRACE_SECONDS,
    LivePolicyNumberField.MAX_ACTIVE_STREAMS,
    LivePolicyNumberField.MAX_SESSIONS_PER_USER,
    LivePolicyNumberField.SESSIONS_PER_USER_PER_HOUR,
    LivePolicyNumberField.BUDGET_SOFT_STOP_PERCENT,
  ] as const;
  const numbers: Partial<Record<LivePolicyNumberField, number>> = {};
  for (const field of wholeFields) {
    const parsed = liveWholeNumberInput(values[field]);
    if (parsed === null) {
      return { config: null, invalidField: field };
    }
    numbers[field] = parsed;
  }
  const dailyBudgetMicroUsd = usdInputToMicroUsd(values.dailyBudgetUsd);
  if (dailyBudgetMicroUsd === null || dailyBudgetMicroUsd === undefined) {
    return { config: null, invalidField: LivePolicyNumberField.DAILY_BUDGET_USD };
  }
  return {
    invalidField: null,
    config: {
      ...base,
      featureEnabled: values.featureEnabled,
      killSwitch: values.killSwitch,
      serverPullPlatforms: values.serverPull ? [...LIVE_SERVER_PULL_PLATFORMS] : [],
      plans,
      defaultPlan,
      graceSeconds: numbers.graceSeconds ?? base.graceSeconds,
      maxActiveStreams: numbers.maxActiveStreams ?? base.maxActiveStreams,
      maxSessionsPerUser: numbers.maxSessionsPerUser ?? base.maxSessionsPerUser,
      sessionsPerUserPerHour: numbers.sessionsPerUserPerHour ?? base.sessionsPerUserPerHour,
      dailyBudgetMicroUsd,
      budgetSoftStopPercent: numbers.budgetSoftStopPercent ?? base.budgetSoftStopPercent,
    },
  };
}

/** Read-only preview of the model chains the form does not edit. */
export function liveModelChainsPreview(config: LivePolicyConfig): string {
  return JSON.stringify(
    { summaryModelChain: config.summaryModelChain, visionModelChain: config.visionModelChain },
    null,
    2,
  );
}
