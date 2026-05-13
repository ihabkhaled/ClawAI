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
  // The BE returns HTTP 200 with an empty body when no digest exists for today.
  // The fetch client surfaces that as undefined or an empty value — normalise to
  // null so the page's `today === null` empty-state branch fires.
  const data = response.data;
  if (data === undefined || data === null) {
    return null;
  }
  // Guard against partial payloads (missing `sections`) — treat as no-digest too.
  if (typeof data !== 'object' || !Array.isArray((data as { sections?: unknown }).sections)) {
    return null;
  }
  return data;
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
