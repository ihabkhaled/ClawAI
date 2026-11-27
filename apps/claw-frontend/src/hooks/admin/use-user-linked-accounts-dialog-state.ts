import { useCallback, useState } from 'react';

import type { UseUserLinkedAccountsDialogStateReturn } from '@/types/admin-security-settings.types';
import type { AdminUser } from '@/types/audit.types';

/**
 * Which account the "Linked accounts" dialog is open for. Composed FROM
 * `useUserTableState`; the table TSX still calls one controller hook. Gated by
 * the users page itself: the endpoint needs ADMIN_USERS_MANAGE, the same
 * permission as the page.
 */
export function useUserLinkedAccountsDialogState(): UseUserLinkedAccountsDialogStateReturn {
  const [linkedAccountsUser, setLinkedAccountsUser] = useState<AdminUser | null>(null);
  const openLinkedAccounts = useCallback(
    (user: AdminUser): void => setLinkedAccountsUser(user),
    [],
  );
  const closeLinkedAccounts = useCallback((): void => setLinkedAccountsUser(null), []);
  return { linkedAccountsUser, openLinkedAccounts, closeLinkedAccounts };
}
