import { apiClient } from '@/services/shared/api-client';
import type {
  AssistantModelRecord,
  ReplaceAssistantModelsRequest,
} from '@/types/smart-router-admin.types';

const BASE = '/routing/assistant-models';

/**
 * The models that do jobs beside routing — today, the research gate that
 * decides whether a turn needs the web before any answering model runs.
 *
 * These were environment variables until an operator could not change one
 * without a redeploy, and a model named in an env var could not be checked
 * against the catalog at all.
 */
export const assistantModelsRepository = {
  async listByRole(role: string): Promise<readonly AssistantModelRecord[]> {
    const response = await apiClient.get<readonly AssistantModelRecord[]>(
      `${BASE}/${encodeURIComponent(role)}`,
    );
    return response.data;
  },

  /** Declarative replace: the body is the whole desired list, in order. */
  async replaceRole(
    role: string,
    payload: ReplaceAssistantModelsRequest,
  ): Promise<readonly AssistantModelRecord[]> {
    const response = await apiClient.put<readonly AssistantModelRecord[]>(
      `${BASE}/${encodeURIComponent(role)}`,
      payload,
    );
    return response.data;
  },
};
