import { apiClient } from '@/services/shared/api-client';
import type {
  ListPluginCatalogParams,
  PluginCatalogDetail,
  PluginCatalogPage,
} from '@/types/plugins.types';

const BASE_PATH = '/plugins/catalog';

/** The api client takes string query values; omitted filters are not sent. */
function toQuery(params: ListPluginCatalogParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.locale !== undefined) {
    query.locale = params.locale;
  }
  if (params.q !== undefined) {
    query.q = params.q;
  }
  if (params.category !== undefined) {
    query.category = params.category;
  }
  if (params.cursor !== undefined) {
    query.cursor = params.cursor;
  }
  if (params.limit !== undefined) {
    query.limit = String(params.limit);
  }
  return query;
}

/** The only place the browser talks to the plugin catalog API. Read-only in this batch. */
export const pluginsRepository = {
  async listCatalog(params: ListPluginCatalogParams): Promise<PluginCatalogPage> {
    const response = await apiClient.get<PluginCatalogPage>(BASE_PATH, toQuery(params));
    return response.data;
  },

  async getCatalogEntry(slug: string, locale?: string): Promise<PluginCatalogDetail> {
    const path = `${BASE_PATH}/${encodeURIComponent(slug)}`;
    const response =
      locale === undefined
        ? await apiClient.get<PluginCatalogDetail>(path)
        : await apiClient.get<PluginCatalogDetail>(path, { locale });
    return response.data;
  },
};
