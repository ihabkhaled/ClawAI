import { PluginSettingKey } from '../../../common/enums/plugin-setting-key.enum';

export const RUNTIME_SETTING_KEYS: readonly PluginSettingKey[] = [
  PluginSettingKey.USER_SERVERS_ENABLED,
  PluginSettingKey.USER_SERVERS_REQUIRE_APPROVAL,
  PluginSettingKey.CALL_TIMEOUT_MS,
  PluginSettingKey.CALL_MAX_RESULT_BYTES,
  PluginSettingKey.RATE_PER_USER_PER_MINUTE,
  PluginSettingKey.RATE_PER_USER_CONCURRENT,
];

export const LOOP_SETTING_KEYS: readonly PluginSettingKey[] = [
  PluginSettingKey.LOOP_MAX_ROUNDS,
  PluginSettingKey.LOOP_MAX_CALLS_PER_TURN,
];
