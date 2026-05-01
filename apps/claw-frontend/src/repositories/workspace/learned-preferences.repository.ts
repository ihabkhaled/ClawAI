import { apiClient } from '../../services/shared/api-client';

export type LearnedPreferenceItem = {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  updatedAt: string;
};

export async function listLearnedPreferences(
  actionKind?: string,
  limit = 25,
): Promise<LearnedPreferenceItem[]> {
  const params = new URLSearchParams();
  if (actionKind !== undefined && actionKind.length > 0) {
    params.set('actionKind', actionKind);
  }
  params.set('limit', String(limit));
  const response = await apiClient.get<LearnedPreferenceItem[]>(
    `/workspace/automation-preferences/learned?${params.toString()}`,
  );
  return response.data;
}
