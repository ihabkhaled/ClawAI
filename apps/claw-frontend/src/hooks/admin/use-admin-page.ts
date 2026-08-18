import { useQuery } from '@tanstack/react-query';

import { UserRole, UserStatus } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { healthRepository } from '@/repositories/health/health.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAdminPageReturn } from '@/types';

export function useAdminPage(): UseAdminPageReturn {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const userQuery = { page: 1, limit: 20 };
  const isAdmin = user?.role === UserRole.ADMIN;

  const usersQuery = useQuery({
    queryKey: [...queryKeys.admin.users, userQuery],
    queryFn: () => auditRepository.getAdminUsers(userQuery),
    enabled: isAdmin,
  });
  const healthQuery = useQuery({
    queryKey: queryKeys.health.aggregated,
    queryFn: () => healthRepository.getAggregatedHealth(),
    refetchInterval: 30_000,
    enabled: isAdmin,
  });
  const users = usersQuery.data?.data ?? [];

  return {
    t,
    user: user ?? null,
    totalUsers: usersQuery.data?.meta.total ?? 0,
    activeCount: users.filter((currentUser) => currentUser.status === UserStatus.ACTIVE).length,
    healthQuery: {
      isLoading: healthQuery.isLoading,
      isError: healthQuery.isError,
      data: healthQuery.data,
    },
  };
}
