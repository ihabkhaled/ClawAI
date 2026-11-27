import { apiClient } from '@/services/shared/api-client';
import type { LinkedAccountsResponse } from '@/types/admin-security-settings.types';

/** Accounts sharing a device, device id or sign-up network with one user. ADMIN_USERS_MANAGE. */
export const userLinkedAccountsRepository = {
  async getLinkedAccounts(userId: string): Promise<LinkedAccountsResponse> {
    const response = await apiClient.get<LinkedAccountsResponse>(
      `/admin/users/${encodeURIComponent(userId)}/linked-accounts`,
    );
    return response.data;
  },
};
