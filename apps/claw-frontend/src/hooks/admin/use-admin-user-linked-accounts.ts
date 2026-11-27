import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { userLinkedAccountsRepository } from '@/repositories/admin/user-linked-accounts.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAdminUserLinkedAccountsReturn } from '@/types/admin-security-settings.types';

/** Accounts sharing this user's device, device id or sign-up network. ADMIN_USERS_MANAGE. */
export function useAdminUserLinkedAccounts(userId: string): UseAdminUserLinkedAccountsReturn {
  const query = useQuery({
    queryKey: queryKeys.admin.userLinkedAccounts(userId),
    queryFn: () => userLinkedAccountsRepository.getLinkedAccounts(userId),
  });
  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query]);
  return {
    accounts: query.data?.accounts ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch,
  };
}
