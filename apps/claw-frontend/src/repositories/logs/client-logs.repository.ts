import { apiClient } from '@/services/shared/api-client';
import type { ClientLogsListParams, ClientLogsResponse, LogStats } from '@/types';

function toStringParams(params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = String(value);
    }
  }
  return result;
}

export const clientLogsRepository = {
  async getLogs(params: ClientLogsListParams): Promise<ClientLogsResponse> {
    const response = await apiClient.get<ClientLogsResponse>(
      '/client-logs',
      toStringParams(params as Record<string, unknown>),
    );
    return response.data;
  },

  async getStats(): Promise<LogStats> {
    const response = await apiClient.get<LogStats>('/client-logs/stats');
    return response.data;
  },
};
