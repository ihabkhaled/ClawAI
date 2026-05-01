import type { ImplHandoffMode } from '../../enums/impl-handoff-mode.enum';
import type { ImplHandoffStatus } from '../../enums/impl-handoff-status.enum';
import { apiClient } from '../../services/shared/api-client';
import type { FanoutResponse, HandoffPayload } from '../../types/impl-handoff.types';

const BASE = '/workspace/impl-handoffs';
const FANOUT_BASE = '/workspace/decompose-fanout';

export async function listImplHandoffs(
  status?: ImplHandoffStatus,
  limit = 25,
): Promise<HandoffPayload[]> {
  const params = new URLSearchParams();
  if (status !== undefined) {
    params.set('status', status);
  }
  params.set('limit', String(limit));
  const response = await apiClient.get<HandoffPayload[]>(`${BASE}?${params.toString()}`);
  return response.data;
}

export async function initiateHandoff(
  queueId: string,
  mode: ImplHandoffMode,
): Promise<HandoffPayload> {
  const response = await apiClient.post<HandoffPayload>(
    `${BASE}/queue/${encodeURIComponent(queueId)}`,
    { mode },
  );
  return response.data;
}

export async function fanoutDecompose(queueId: string): Promise<FanoutResponse> {
  const response = await apiClient.post<FanoutResponse>(
    `${FANOUT_BASE}/queue/${encodeURIComponent(queueId)}`,
  );
  return response.data;
}
