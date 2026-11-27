import type { SecuritySettingKey } from '@/enums/security-setting-key.enum';
import { systemSettingsRepository } from '@/repositories/admin/system-settings.repository';
import type {
  SecuritySettingChange,
  SecuritySettingsSaveResult,
  SystemSettingView,
} from '@/types/admin-security-settings.types';

/**
 * Saves the Sign-up protection page: one PUT per changed key (the settings API
 * is per key). Every PUT is attempted even when one fails, and the result names
 * the refused keys so the page can say that only some were saved.
 */
export const securitySettingsService = {
  async save(changes: ReadonlyArray<SecuritySettingChange>): Promise<SecuritySettingsSaveResult> {
    const outcomes = await Promise.allSettled(
      changes.map((change) => systemSettingsRepository.set(change.key, change.value)),
    );
    const result: SecuritySettingsSaveResult = { saved: [], failed: [] };
    for (const [index, outcome] of outcomes.entries()) {
      const change = changes[index];
      if (change === undefined) {
        continue;
      }
      if (outcome.status === 'fulfilled') {
        result.saved.push(change.key);
      } else {
        result.failed.push(change.key);
      }
    }
    return result;
  },

  /**
   * Removes a secret saved on this page. An empty value clears any security.*
   * key server-side; the server environment's key, if one is set, is then the
   * one in force, otherwise the provider is off.
   */
  removeSecret(key: SecuritySettingKey): Promise<SystemSettingView> {
    return systemSettingsRepository.set(key, '');
  },
};
