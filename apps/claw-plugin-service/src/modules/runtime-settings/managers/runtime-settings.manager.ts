import { Injectable } from '@nestjs/common';

import { PluginSettingKey } from '../../../common/enums/plugin-setting-key.enum';
import {
  settingRuleFor,
  storedSettingValue,
} from '../../admin/utilities/is-valid-setting-value.utility';
import { PLUGIN_SETTING_DEFAULTS } from '../../seeding/constants/plugin-setting-defaults.constants';
import { LOOP_SETTING_KEYS, RUNTIME_SETTING_KEYS } from '../constants/runtime-settings.constants';
import { RuntimeSettingsRepository } from '../repositories/runtime-settings.repository';
import { type LoopLimits, type RuntimeSettings } from '../types/runtime-settings.types';

/**
 * Reads the admin-editable settings the runtime needs. A missing row, or one whose value is no
 * longer valid for its rule, reads as the seeded default, so a bad edit can never widen a limit
 * beyond what the rule allows.
 */
@Injectable()
export class RuntimeSettingsManager {
  constructor(private readonly repository: RuntimeSettingsRepository) {}

  async load(): Promise<RuntimeSettings> {
    const rows = await this.repository.findByKeys(RUNTIME_SETTING_KEYS);
    const stored = new Map(rows.map((row) => [row.key, row.value]));
    const read = (key: PluginSettingKey): boolean | number => {
      const value = storedSettingValue(settingRuleFor(key), stored.get(key));
      return value ?? this.defaultFor(key);
    };
    return {
      userServersEnabled: read(PluginSettingKey.USER_SERVERS_ENABLED) === true,
      requireApproval: read(PluginSettingKey.USER_SERVERS_REQUIRE_APPROVAL) === true,
      callTimeoutMs: Number(read(PluginSettingKey.CALL_TIMEOUT_MS)),
      maxResultBytes: Number(read(PluginSettingKey.CALL_MAX_RESULT_BYTES)),
      ratePerMinute: Number(read(PluginSettingKey.RATE_PER_USER_PER_MINUTE)),
      concurrentPerUser: Number(read(PluginSettingKey.RATE_PER_USER_CONCURRENT)),
    };
  }

  /** The per-message tool-round and tool-call caps chat-service applies to its loop. */
  async loadLoopLimits(): Promise<LoopLimits> {
    const rows = await this.repository.findByKeys(LOOP_SETTING_KEYS);
    const stored = new Map(rows.map((row) => [row.key, row.value]));
    const read = (key: PluginSettingKey): number =>
      Number(storedSettingValue(settingRuleFor(key), stored.get(key)) ?? this.defaultFor(key));
    return {
      maxRounds: read(PluginSettingKey.LOOP_MAX_ROUNDS),
      maxCallsPerTurn: read(PluginSettingKey.LOOP_MAX_CALLS_PER_TURN),
    };
  }

  private defaultFor(key: PluginSettingKey): boolean | number {
    return PLUGIN_SETTING_DEFAULTS.find((entry) => entry.key === key)?.value ?? 0;
  }
}
