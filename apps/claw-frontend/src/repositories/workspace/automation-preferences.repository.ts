import { apiClient } from '../../services/shared/api-client';
import type {
  AutomationPreferenceView,
  UpsertAutomationPreferenceRequest,
} from '../../types/automation-preference.types';

const BASE = '/workspace/automation-preferences';

export async function listAutomationPreferences(): Promise<AutomationPreferenceView[]> {
  const response = await apiClient.get<AutomationPreferenceView[]>(BASE);
  return response.data;
}

export async function upsertAutomationPreference(
  actionKind: string,
  payload: UpsertAutomationPreferenceRequest,
): Promise<AutomationPreferenceView> {
  const response = await apiClient.put<AutomationPreferenceView>(
    `${BASE}/${encodeURIComponent(actionKind)}`,
    payload,
  );
  return response.data;
}
