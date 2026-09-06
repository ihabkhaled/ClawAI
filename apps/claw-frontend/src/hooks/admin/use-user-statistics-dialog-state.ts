import { useCallback, useState } from 'react';

import { Permission } from '@/enums';
import { usePermissions } from '@/hooks/auth/use-permissions';
import type { UseUserStatisticsDialogStateReturn } from '@/types/admin-user-statistics.types';
import type { AdminUser } from '@/types/audit.types';

/**
 * Open state and permission gating for the two per-row statistics dialogs.
 *
 * Composed FROM `useUserTableState`, never called directly from `UserTable.tsx`
 * — the TSX file may only call one controller hook.
 *
 * Each flag names the permission the button's OWN endpoint enforces, not the
 * `ADMIN_USERS_MANAGE` that gates the page around it. The two are separate
 * powers on purpose, so a user-manager without usage access must not be handed
 * a control that 403s on every click.
 */
export function useUserStatisticsDialogState(): UseUserStatisticsDialogStateReturn {
  const { can } = usePermissions();
  const [usageUser, setUsageUser] = useState<AdminUser | null>(null);
  const [subscriptionUser, setSubscriptionUser] = useState<AdminUser | null>(null);

  const openUsage = useCallback((user: AdminUser): void => {
    setUsageUser(user);
  }, []);
  const closeUsage = useCallback((): void => {
    setUsageUser(null);
  }, []);
  const openSubscription = useCallback((user: AdminUser): void => {
    setSubscriptionUser(user);
  }, []);
  const closeSubscription = useCallback((): void => {
    setSubscriptionUser(null);
  }, []);

  return {
    canViewUsage: can(Permission.ADMIN_USAGE_VIEW),
    canViewSubscription: can(Permission.ADMIN_PLANS_MANAGE),
    usageUser,
    openUsage,
    closeUsage,
    subscriptionUser,
    openSubscription,
    closeSubscription,
  };
}
