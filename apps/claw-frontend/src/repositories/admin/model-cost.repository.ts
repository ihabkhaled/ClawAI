import { apiClient } from '@/services/shared/api-client';
import type {
  ModelCostCatalogRow,
  PublishModelCostRequest,
  PublishModelCostResponse,
  UnpricedModelPage,
  UnpricedModelQuery,
} from '@/types/model-cost.types';

/**
 * routing-service mounts these at `router-models/*`, NOT under `routing/*`
 * like the model registry — nginx proxies the prefix separately
 * (`infra/nginx/locations.conf`).
 */
const BASE = '/router-models/costs';

export const modelCostRepository = {
  async listCatalog(): Promise<ModelCostCatalogRow[]> {
    const response = await apiClient.get<ModelCostCatalogRow[]>(`${BASE}/catalog`);
    return response.data;
  },

  /**
   * Exposed models with no real price (unpriced or only a fallback), including
   * connector models that never reached the registry. An empty search is not
   * sent: the backend rejects a blank `search`.
   */
  async listUnpriced(query: UnpricedModelQuery): Promise<UnpricedModelPage> {
    const search = query.search.trim();
    const params: Record<string, string> = {
      page: String(query.page),
      pageSize: String(query.pageSize),
    };
    if (search !== '') {
      params['search'] = search;
    }
    const response = await apiClient.get<UnpricedModelPage>(`${BASE}/unpriced`, params);
    return response.data;
  },

  /**
   * Mints a NEW immutable price version and pins the model as an admin
   * override. There is no update verb by design: history is never rewritten,
   * so a past usage record can still be re-priced with the rates in force when
   * it ran.
   */
  async publish(payload: PublishModelCostRequest): Promise<PublishModelCostResponse> {
    const response = await apiClient.post<PublishModelCostResponse>(BASE, payload);
    return response.data;
  },
};
