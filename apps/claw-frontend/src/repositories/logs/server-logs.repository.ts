import { apiClient } from '@/services/shared/api-client';
import type { ServerLogsListParams, ServerLogsResponse, ServerLogStats } from '@/types';

function toStringParams(params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = String(value);
    }
  }
  return result;
}

export const serverLogsRepository = {
  async getLogs(params: ServerLogsListParams): Promise<ServerLogsResponse> {
    const response = await apiClient.get<ServerLogsResponse>(
      '/server-logs',
      toStringParams(params as Record<string, unknown>),
    );
    return response.data;
  },

  async getStats(): Promise<ServerLogStats> {
    const response = await apiClient.get<ServerLogStats>('/server-logs/stats');
    return response.data;
  },
};
