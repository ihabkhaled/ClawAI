import { apiClient } from '@/services/shared/api-client';
import type { ChangePasswordRequest, UpdatePreferencesRequest, UserProfile } from '@/types';

export const preferencesRepository = {
  async updatePreferences(data: UpdatePreferencesRequest): Promise<UserProfile> {
    const response = await apiClient.patch<UserProfile>('/users/me/preferences', data);
    return response.data;
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.patch<void>('/users/me/password', data);
  },
};
