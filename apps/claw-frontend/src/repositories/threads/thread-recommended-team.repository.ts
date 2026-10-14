import { apiClient } from '@/services/shared/api-client';
import type { ThreadRecommendedTeamResponse } from '@/types/thread-recommended-team.types';

export const threadRecommendedTeamRepository = {
  /** The caller's plan-aware team and per-model availability. */
  async get(): Promise<ThreadRecommendedTeamResponse> {
    const response = await apiClient.get<ThreadRecommendedTeamResponse>(
      '/thread-publications/recommended-team',
    );
    return response.data;
  },
};
