import type {
  PluginAdminCatalogEntryView,
  PluginSettingView,
  UpdatePluginAdminCatalogRequest,
  UpdatePluginSettingsRequest,
} from '@claw/shared-types';

import { apiClient } from '@/services/shared/api-client';

const BASE_PATH = '/plugins/admin';

/** Admin console calls (PLUGINS_ADMIN): the catalog kill switches and the PluginSetting rows. */
export const pluginAdminRepository = {
  async listCatalog(): Promise<PluginAdminCatalogEntryView[]> {
    const response = await apiClient.get<PluginAdminCatalogEntryView[]>(`${BASE_PATH}/catalog`);
    return response.data;
  },

  async updateCatalogEntry(
    slug: string,
    body: UpdatePluginAdminCatalogRequest,
  ): Promise<PluginAdminCatalogEntryView> {
    const response = await apiClient.patch<PluginAdminCatalogEntryView>(
      `${BASE_PATH}/catalog/${encodeURIComponent(slug)}`,
      body,
    );
    return response.data;
  },

  async listSettings(): Promise<PluginSettingView[]> {
    const response = await apiClient.get<PluginSettingView[]>(`${BASE_PATH}/settings`);
    return response.data;
  },

  async updateSettings(body: UpdatePluginSettingsRequest): Promise<PluginSettingView[]> {
    const response = await apiClient.patch<PluginSettingView[]>(`${BASE_PATH}/settings`, body);
    return response.data;
  },
};
