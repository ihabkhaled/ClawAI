import { apiClient } from '@/services/shared/api-client';
import type {
  ClearProviderBreakerResponse,
  SkippedProvidersResponse,
} from '@/types/provider-breaker.types';

// chat-service, ADMIN only (ADR-125 addendum).
export const providerBreakerRepository = {
  async list(): Promise<SkippedProvidersResponse> {
    const response = await apiClient.get<SkippedProvidersResponse>(
      '/chat-messages/admin/provider-breakers',
    );
    return response.data;
  },

  async clear(provider: string): Promise<ClearProviderBreakerResponse> {
    const response = await apiClient.delete<ClearProviderBreakerResponse>(
      `/chat-messages/admin/provider-breakers/${encodeURIComponent(provider)}`,
    );
    return response.data;
  },
};
