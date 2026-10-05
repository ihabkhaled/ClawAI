import { UsageRangePreset } from '@/enums/usage-range-preset.enum';

/** Server ceiling on a requested range. Mirrors auth-service `ADMIN_USAGE_MAX_RANGE_DAYS`. */
export const USAGE_MAX_RANGE_DAYS = 90;

/** Server ceiling on the "last N hours" preset (one week, the hourly limit). */
export const USAGE_MAX_HOURS = 168;

export const USAGE_DEFAULT_HOURS = 24;

/** Quick picks for the hours input. */
export const USAGE_HOUR_CHOICES: readonly number[] = [6, 12, 24, 48];

export const USAGE_WEEK_DAYS = 7;
export const USAGE_MONTH_DAYS = 30;

/** Rows per ranked list on the Observability page. The server caps at 50. */
export const USAGE_LIST_LIMIT = 10;

export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

/** Presets offered in the per-user modal (no custom hours or dates there). */
export const USER_USAGE_PRESETS: readonly UsageRangePreset[] = [
  UsageRangePreset.Today,
  UsageRangePreset.Week,
  UsageRangePreset.Month,
];

/** Presets offered on the Observability page. */
export const OBSERVABILITY_USAGE_PRESETS: readonly UsageRangePreset[] = [
  UsageRangePreset.Today,
  UsageRangePreset.Hours,
  UsageRangePreset.Week,
  UsageRangePreset.Month,
  UsageRangePreset.Custom,
];

/** Gated tool keys that have a translated label under `usageAnalytics.tools`. */
export const KNOWN_USAGE_TOOLS: readonly string[] = [
  'WEB_SEARCH',
  'WEB_FETCH',
  'WEB_EXTRACT',
  'FILE_GENERATION',
  'COMPARE_MODE',
  'JUDGE_MODE',
  'RESEARCH_MODE',
  'CRITIC_REVIEW',
  'WORKSPACES',
  'MEMORY',
  'CONTEXT_PACKS',
];

/** Translation key suffix per preset (`usageAnalytics.preset<Name>`). */
export const USAGE_PRESET_LABEL_KEYS: Record<UsageRangePreset, string> = {
  [UsageRangePreset.Today]: 'usageAnalytics.presetToday',
  [UsageRangePreset.Hours]: 'usageAnalytics.presetHours',
  [UsageRangePreset.Week]: 'usageAnalytics.presetWeek',
  [UsageRangePreset.Month]: 'usageAnalytics.presetMonth',
  [UsageRangePreset.Custom]: 'usageAnalytics.presetCustom',
};
