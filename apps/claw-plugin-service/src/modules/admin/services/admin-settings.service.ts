import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { type PluginSettingValue, type PluginSettingView } from '@claw/shared-types';

import { PluginErrorCode } from '../../../common/enums/plugin-error-code.enum';
import { PLUGIN_SETTING_DEFAULTS } from '../../seeding/constants/plugin-setting-defaults.constants';
import { type UpdateSettingsBody } from '../dto/admin.dto';
import { AdminSettingsRepository } from '../repositories/admin-settings.repository';
import { type SettingProblem } from '../types/admin.types';
import {
  isValidSettingValue,
  settingRuleFor,
  storedSettingValue,
} from '../utilities/is-valid-setting-value.utility';

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(private readonly repository: AdminSettingsRepository) {}

  /** Every known setting: the stored value, or the default when it is missing or no longer valid. */
  async list(): Promise<PluginSettingView[]> {
    const rows = await this.repository.findAll();
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return PLUGIN_SETTING_DEFAULTS.map((setting) => {
      const row = byKey.get(setting.key);
      const stored = storedSettingValue(settingRuleFor(setting.key), row?.value);
      return row !== undefined && stored !== undefined
        ? { key: setting.key, value: stored, updatedAt: row.updatedAt.toISOString() }
        : { key: setting.key, value: setting.value, updatedAt: null };
    });
  }

  /** All-or-nothing: one bad key or value rejects the whole change. */
  async update(adminId: string, body: UpdateSettingsBody): Promise<PluginSettingView[]> {
    const problems = this.problemsOf(body.values);
    if (problems.length > 0) {
      throw new BadRequestException({
        message: 'Settings are not valid',
        errorCode: PluginErrorCode.SETTING_INVALID,
        errors: problems,
      });
    }
    await this.repository.upsertMany(body.values, adminId);
    this.logger.log(`update: admin=${adminId} keys=${Object.keys(body.values).join(',')}`);
    return this.list();
  }

  private problemsOf(values: Record<string, PluginSettingValue>): SettingProblem[] {
    const problems: SettingProblem[] = [];
    for (const [key, value] of Object.entries(values)) {
      const rule = settingRuleFor(key);
      if (rule === undefined) {
        problems.push({ field: key, message: 'unknown setting' });
      } else if (!isValidSettingValue(rule, value)) {
        problems.push({ field: key, message: 'value is not allowed for this setting' });
      }
    }
    return problems;
  }
}
