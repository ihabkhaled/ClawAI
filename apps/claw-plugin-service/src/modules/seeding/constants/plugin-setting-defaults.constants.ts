import { PluginSettingKey } from '../../../common/enums/plugin-setting-key.enum';
import { type PluginSettingDefault } from '../types/seeding.types';

// Defaults from the plugins design (section 2). They are inserted only when the
// key is missing, so an admin edit survives every boot.
export const PLUGIN_SETTING_DEFAULTS: readonly PluginSettingDefault[] = [
  { key: PluginSettingKey.USER_SERVERS_ENABLED, value: true },
  { key: PluginSettingKey.USER_SERVERS_REQUIRE_APPROVAL, value: false },
  { key: PluginSettingKey.USER_SERVERS_ALLOW_HTTP, value: false },
  { key: PluginSettingKey.LOOP_MAX_ROUNDS, value: 5 },
  { key: PluginSettingKey.LOOP_MAX_CALLS_PER_TURN, value: 6 },
  { key: PluginSettingKey.CALL_TIMEOUT_MS, value: 30_000 },
  { key: PluginSettingKey.CALL_MAX_RESULT_BYTES, value: 262_144 },
  { key: PluginSettingKey.INVOCATIONS_RETENTION_DAYS, value: 90 },
  { key: PluginSettingKey.RATE_PER_USER_PER_MINUTE, value: 20 },
  { key: PluginSettingKey.RATE_PER_USER_CONCURRENT, value: 3 },
];
