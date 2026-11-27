import { apiClient } from '@/services/shared/api-client';
import type { SystemSettingView } from '@/types/admin-security-settings.types';

/**
 * Platform settings (auth-service `admin/settings`, the SystemSetting key/value
 * store). Reading is ADMIN_SYSTEM_VIEW, writing ADMIN_CREDIT_MANAGE server-side.
 * Write-only secrets come back as `value: ''` with `configured: true`.
 */
export const systemSettingsRepository = {
  async list(): Promise<SystemSettingView[]> {
    const response = await apiClient.get<SystemSettingView[]>('/admin/settings');
    return response.data;
  },

  async set(key: string, value: string): Promise<SystemSettingView> {
    const response = await apiClient.put<SystemSettingView>(
      `/admin/settings/${encodeURIComponent(key)}`,
      { value },
    );
    return response.data;
  },
};
