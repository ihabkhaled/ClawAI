import { apiClient } from '../../services/shared/api-client';
import type { ModelSizeCatalogResponse } from '../../types/model-scale.types';

const MODEL_SIZES_PATH = '/routing/model-sizes';

// Context window and parameter count of every model (ADR-234). Gated by
// MODEL_USE_ALLOWED, the same permission as the picker list it decorates.
export async function getModelSizes(): Promise<ModelSizeCatalogResponse> {
  const response = await apiClient.get<ModelSizeCatalogResponse>(MODEL_SIZES_PATH);
  return response.data;
}
