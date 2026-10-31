import { useCallback, useState } from 'react';

import type { AdminUser, UseUserSecurityDialogStateReturn } from '@/types';

/** Which account the detail, ban and set-password dialogs are open for. One at a time each. */
export function useUserSecurityDialogState(): UseUserSecurityDialogStateReturn {
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [banUser, setBanUser] = useState<AdminUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);

  const openDetail = useCallback((user: AdminUser): void => setDetailUser(user), []);
  const closeDetail = useCallback((): void => setDetailUser(null), []);
  const openBan = useCallback((user: AdminUser): void => setBanUser(user), []);
  const closeBan = useCallback((): void => setBanUser(null), []);
  const openPassword = useCallback((user: AdminUser): void => setPasswordUser(user), []);
  const closePassword = useCallback((): void => setPasswordUser(null), []);

  return {
    detailUser,
    openDetail,
    closeDetail,
    banUser,
    openBan,
    closeBan,
    passwordUser,
    openPassword,
    closePassword,
  };
}
