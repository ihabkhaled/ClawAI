import { apiClient } from '../../services/shared/api-client';
import type {
  AiActionPolicy,
  CreateAiActionPolicyRequest,
  CreateSuggestionTriggerRuleRequest,
  SuggestionTriggerRule,
  UpdateAiActionPolicyRequest,
  UpdateSuggestionTriggerRuleRequest,
} from '../../types/ai-action-policy.types';

const POLICIES_BASE = '/workspace/ai-actions/policies';
const RULES_BASE = '/workspace/suggestion-rules';

export async function listAiActionPolicies(): Promise<AiActionPolicy[]> {
  const response = await apiClient.get<AiActionPolicy[]>(POLICIES_BASE);
  return response.data;
}

export async function createAiActionPolicy(
  payload: CreateAiActionPolicyRequest,
): Promise<AiActionPolicy> {
  const response = await apiClient.post<AiActionPolicy>(POLICIES_BASE, payload);
  return response.data;
}

export async function updateAiActionPolicy(
  id: string,
  payload: UpdateAiActionPolicyRequest,
): Promise<AiActionPolicy> {
  const response = await apiClient.patch<AiActionPolicy>(
    `${POLICIES_BASE}/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data;
}

export async function deleteAiActionPolicy(id: string): Promise<void> {
  await apiClient.delete(`${POLICIES_BASE}/${encodeURIComponent(id)}`);
}

export async function listSuggestionRules(): Promise<SuggestionTriggerRule[]> {
  const response = await apiClient.get<SuggestionTriggerRule[]>(RULES_BASE);
  return response.data;
}

export async function createSuggestionRule(
  payload: CreateSuggestionTriggerRuleRequest,
): Promise<SuggestionTriggerRule> {
  const response = await apiClient.post<SuggestionTriggerRule>(RULES_BASE, payload);
  return response.data;
}

export async function updateSuggestionRule(
  id: string,
  payload: UpdateSuggestionTriggerRuleRequest,
): Promise<SuggestionTriggerRule> {
  const response = await apiClient.patch<SuggestionTriggerRule>(
    `${RULES_BASE}/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data;
}

export async function deleteSuggestionRule(id: string): Promise<void> {
  await apiClient.delete(`${RULES_BASE}/${encodeURIComponent(id)}`);
}
