import { apiClient } from '../../services/shared/api-client';
import type { ApprovePairingRequest, DenyPairingRequest } from '../../types/agent.types';

const BASE = '/agent/auth';

export async function approvePairing(dto: ApprovePairingRequest): Promise<{ deviceId: string }> {
  const response = await apiClient.post<{ deviceId: string }>(`${BASE}/pair/approve`, dto);
  return response.data;
}

export async function denyPairing(dto: DenyPairingRequest): Promise<{ ok: true }> {
  const response = await apiClient.post<{ ok: true }>(`${BASE}/pair/deny`, dto);
  return response.data;
}

export async function approveDeviceCode(payload: {
  userCode: string;
  scopes: string[];
  deviceName?: string;
}): Promise<{ deviceId: string }> {
  const response = await apiClient.post<{ deviceId: string }>(
    `${BASE}/device-code/approve`,
    payload,
  );
  return response.data;
}

export async function denyDeviceCode(userCode: string): Promise<{ ok: true }> {
  const response = await apiClient.post<{ ok: true }>(`${BASE}/device-code/deny`, { userCode });
  return response.data;
}
