import { preferencesRepository } from '@/repositories/preferences/preferences.repository';
import { useAuthStore } from '@/stores/auth.store';
import type { UpdatePreferencesRequest, UserProfile } from '@/types';

export const preferencesService = {
  async updatePreferences(data: UpdatePreferencesRequest): Promise<UserProfile> {
    const updatedUser = await preferencesRepository.updatePreferences(data);
    useAuthStore.getState().setUser(updatedUser);
    return updatedUser;
  },
};
