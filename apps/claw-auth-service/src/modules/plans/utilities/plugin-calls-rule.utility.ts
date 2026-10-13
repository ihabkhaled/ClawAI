import { PlanFeatureAccessMode, PlanFeatureWindow } from '../../../generated/prisma';
import { type FeatureRuleValues } from '../types/feature-rule-values.types';

/**
 * The PLUGIN_CALLS feature rule that a plan's `maxPluginCallsPerDay` column means.
 * Null is unlimited (ENABLED), 0 is disabled, anything else is a daily cap. The
 * column is what an administrator edits; the rule is what the quota reservation reads,
 * so every write to the column goes through here to keep them from drifting.
 */
export function toPluginCallsRule(maxPluginCallsPerDay: number | null): FeatureRuleValues {
  if (maxPluginCallsPerDay === null) {
    return {
      accessMode: PlanFeatureAccessMode.ENABLED,
      limit: null,
      window: PlanFeatureWindow.DAY,
    };
  }
  if (maxPluginCallsPerDay === 0) {
    return {
      accessMode: PlanFeatureAccessMode.DISABLED,
      limit: null,
      window: PlanFeatureWindow.DAY,
    };
  }
  return {
    accessMode: PlanFeatureAccessMode.LIMITED,
    limit: maxPluginCallsPerDay,
    window: PlanFeatureWindow.DAY,
  };
}
