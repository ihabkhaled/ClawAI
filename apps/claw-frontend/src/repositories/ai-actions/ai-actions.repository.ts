import type { AiActionKind, AiActionPrivacyClass } from '../../enums/ai-action-kind.enum';
import { apiClient } from '../../services/shared/api-client';
import type {
  AiActionResult,
  AutoRouterResolution,
  ModelChoice,
  ResolveAiActionRequest,
} from '../../types/ai-action.types';

const BASE = '/workspace/ai-actions';

export async function resolveAiAction(
  request: ResolveAiActionRequest,
): Promise<AutoRouterResolution> {
  const response = await apiClient.post<AutoRouterResolution>(`${BASE}/resolve`, request);
  return response.data;
}

export type RunAiActionBody = {
  actionKind: AiActionKind;
  privacyClass: AiActionPrivacyClass;
  context: string;
  preferredModel?: ModelChoice;
};

export async function runAiAction(request: RunAiActionBody): Promise<AiActionResult> {
  const response = await apiClient.post<AiActionResult>(`${BASE}/run`, request);
  return response.data;
}
