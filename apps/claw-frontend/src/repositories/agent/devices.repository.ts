import { apiClient } from '../../services/shared/api-client';
import type {
  Device,
  DeviceWithCounts,
  ListDevicesQuery,
  PaginatedDevices,
  RevokeDeviceRequest,
  UpdateDeviceRequest,
} from '../../types/agent.types';

const BASE = '/agent/devices';

export async function listDevices(query?: ListDevicesQuery): Promise<PaginatedDevices> {
  const params = new URLSearchParams();
  if (query?.status !== undefined) {
    params.set('status', query.status);
  }
  if (query?.page !== undefined) {
    params.set('page', String(query.page));
  }
  if (query?.pageSize !== undefined) {
    params.set('pageSize', String(query.pageSize));
  }
  const qs = params.toString();
  const response = await apiClient.get<PaginatedDevices>(`${BASE}${qs ? `?${qs}` : ''}`);
  return response.data;
}

export async function getDevice(id: string): Promise<DeviceWithCounts> {
  const response = await apiClient.get<DeviceWithCounts>(`${BASE}/${id}`);
  return response.data;
}

export async function updateDevice(id: string, dto: UpdateDeviceRequest): Promise<Device> {
  const response = await apiClient.patch<Device>(`${BASE}/${id}`, dto);
  return response.data;
}

export async function revokeDevice(
  id: string,
  dto: RevokeDeviceRequest,
): Promise<DeviceWithCounts> {
  const response = await apiClient.post<DeviceWithCounts>(`${BASE}/${id}/revoke`, dto);
  return response.data;
}
