import { apiClient } from '@/services/shared/api-client';
import type { AggregatedHealth, StatusPageResponse } from '@/types';

export const healthRepository = {
  async getAggregatedHealth(): Promise<AggregatedHealth> {
    const response = await apiClient.get<AggregatedHealth>('/health');
    return response.data;
  },

  /** Admin-only: each component's state now, its uptime history and recent incidents. */
  async getStatusPage(): Promise<StatusPageResponse> {
    const response = await apiClient.get<StatusPageResponse>('/health/status');
    return response.data;
  },
};
