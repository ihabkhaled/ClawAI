import { type PluginSettingValue } from '@claw/shared-types';

import { PLUGIN_SETTING_RULES_BY_KEY } from '../constants/admin-settings.constants';
import { type PluginSettingRule } from '../types/admin.types';

/** The rule for an editable setting key, or undefined for anything else (including inherited names). */
export function settingRuleFor(key: string): PluginSettingRule | undefined {
  return PLUGIN_SETTING_RULES_BY_KEY.get(key);
}

export function isSettingValue(value: unknown): value is PluginSettingValue {
  return typeof value === 'boolean' || typeof value === 'number';
}

/** True when the value is the right kind for the rule and, for a number, a whole number in range. */
export function isValidSettingValue(rule: PluginSettingRule, value: unknown): boolean {
  return rule.kind === 'boolean'
    ? typeof value === 'boolean'
    : typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= rule.min &&
        value <= rule.max;
}

/** The stored value when it is still valid for its rule; undefined otherwise. */
export function storedSettingValue(
  rule: PluginSettingRule | undefined,
  raw: unknown,
): PluginSettingValue | undefined {
  return rule !== undefined && isSettingValue(raw) && isValidSettingValue(rule, raw)
    ? raw
    : undefined;
}
