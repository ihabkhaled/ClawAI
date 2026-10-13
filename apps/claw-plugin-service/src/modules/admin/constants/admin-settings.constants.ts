import { PluginSettingKey } from '../../../common/enums/plugin-setting-key.enum';
import { RESULT_BYTES_MAX, TOOL_TIMEOUT_MAX_MS } from '../../catalog/constants/catalog.constants';
import { type PluginSettingRule } from '../types/admin.types';

// The editable settings and what each may hold. A key missing here cannot be written.
export const PLUGIN_SETTING_RULES: Readonly<Record<PluginSettingKey, PluginSettingRule>> = {
  [PluginSettingKey.USER_SERVERS_ENABLED]: { kind: 'boolean' },
  [PluginSettingKey.USER_SERVERS_REQUIRE_APPROVAL]: { kind: 'boolean' },
  [PluginSettingKey.USER_SERVERS_ALLOW_HTTP]: { kind: 'boolean' },
  [PluginSettingKey.LOOP_MAX_ROUNDS]: { kind: 'integer', min: 1, max: 10 },
  [PluginSettingKey.LOOP_MAX_CALLS_PER_TURN]: { kind: 'integer', min: 1, max: 20 },
  [PluginSettingKey.CALL_TIMEOUT_MS]: { kind: 'integer', min: 1000, max: TOOL_TIMEOUT_MAX_MS },
  [PluginSettingKey.CALL_MAX_RESULT_BYTES]: { kind: 'integer', min: 1024, max: RESULT_BYTES_MAX },
  [PluginSettingKey.INVOCATIONS_RETENTION_DAYS]: { kind: 'integer', min: 1, max: 365 },
  [PluginSettingKey.RATE_PER_USER_PER_MINUTE]: { kind: 'integer', min: 1, max: 600 },
  [PluginSettingKey.RATE_PER_USER_CONCURRENT]: { kind: 'integer', min: 1, max: 20 },
};

export const ADMIN_CATALOG_LOCALE = 'en';
export const ADMIN_SETTINGS_MAX_KEYS = 20;
export const ADMIN_TOOL_CHANGES_MAX = 64;

export const PLUGIN_SETTING_RULES_BY_KEY: ReadonlyMap<string, PluginSettingRule> = new Map(
  Object.entries(PLUGIN_SETTING_RULES),
);
