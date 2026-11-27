import type { SystemSetting } from '../../../generated/prisma';
import {
  MASKED_SETTING_VALUE,
  WRITE_ONLY_SETTING_KEY_PATTERN,
} from '../constants/system-setting.constants';
import type { SystemSettingView } from '../types/system-setting.types';

/** True for a secret the admin API may store but never return (`security.*.secretKey`). */
export function isWriteOnlySettingKey(key: string): boolean {
  return WRITE_ONLY_SETTING_KEY_PATTERN.test(key);
}

/** The admin view of one row; a write-only key shows '' and whether a value is stored. */
export function toSystemSettingView(row: SystemSetting): SystemSettingView {
  const view = { key: row.key, value: row.value, updatedAt: row.updatedAt.toISOString() };
  return isWriteOnlySettingKey(row.key)
    ? { ...view, value: MASKED_SETTING_VALUE, configured: row.value.trim().length > 0 }
    : view;
}
