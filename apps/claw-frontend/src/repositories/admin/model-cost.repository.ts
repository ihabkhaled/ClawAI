import { apiClient } from '@/services/shared/api-client';
import type {
  ModelCostCatalogRow,
  PublishModelCostRequest,
  PublishModelCostResponse,
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
