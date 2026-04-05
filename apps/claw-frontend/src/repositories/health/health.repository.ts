import { apiClient } from '@/services/shared/api-client';
import type { AggregatedHealth } from '@/types';

export const healthRepository = {
  async getAggregatedHealth(): Promise<AggregatedHealth> {
    const response = await apiClient.get<AggregatedHealth>('/health');
    return response.data;
  },
};
