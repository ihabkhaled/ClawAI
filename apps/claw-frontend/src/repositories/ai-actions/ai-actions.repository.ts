import { apiClient } from '../../services/shared/api-client';
import type { AutoRouterResolution, ResolveAiActionRequest } from '../../types/ai-action.types';

const BASE = '/workspace/ai-actions';

export async function resolveAiAction(
  request: ResolveAiActionRequest,
): Promise<AutoRouterResolution> {
  const response = await apiClient.post<AutoRouterResolution>(`${BASE}/resolve`, request);
  return response.data;
}
