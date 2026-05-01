import type { DigestScope } from '../../enums/digest-scope.enum';
import { apiClient } from '../../services/shared/api-client';
import type {
  DigestPreferenceView,
  DigestSnapshotPayload,
  UpsertDigestPreferenceRequest,
} from '../../types/workspace-digest.types';

const BASE = '/workspace/digests';

export async function getTodayDigest(): Promise<DigestSnapshotPayload | null> {
  const response = await apiClient.get<DigestSnapshotPayload | null>(`${BASE}/today`);
  return response.data;
}

export async function listDigests(
  scope: DigestScope,
  limit = 14,
): Promise<DigestSnapshotPayload[]> {
  const response = await apiClient.get<DigestSnapshotPayload[]>(
    `${BASE}?scope=${scope}&limit=${String(limit)}`,
  );
  return response.data;
}

export async function getDigestPreferences(): Promise<DigestPreferenceView> {
  const response = await apiClient.get<DigestPreferenceView>(`${BASE}/preferences`);
  return response.data;
}

export async function updateDigestPreferences(
  payload: UpsertDigestPreferenceRequest,
): Promise<DigestPreferenceView> {
  const response = await apiClient.patch<DigestPreferenceView>(`${BASE}/preferences`, payload);
  return response.data;
}

export async function triggerMyDigest(scope: DigestScope): Promise<{ status: 'STARTED' }> {
  const response = await apiClient.post<{ status: 'STARTED' }>(
    `${BASE}/trigger-mine?scope=${scope}`,
  );
  return response.data;
}
