import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { UserRole, UserStatus } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { healthRepository } from '@/repositories/health/health.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAdminPageReturn } from '@/types';
import { logger, showToast } from '@/utilities';

export function useAdminPage(): UseAdminPageReturn {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [actionPending, setActionPending] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: () => auditRepository.getAdminUsers(),
    enabled: user?.role === UserRole.ADMIN,
  });

  const healthQuery = useQuery({
    queryKey: queryKeys.health.aggregated,
    queryFn: () => healthRepository.getAggregatedHealth(),
    refetchInterval: 30_000,
    enabled: user?.role === UserRole.ADMIN,
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      auditRepository.updateUserRole(userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.userRoleUpdated') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.userRoleUpdateFailed'));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => auditRepository.deactivateUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.userDeactivated') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.userDeactivateFailed'));
    },
  });

  const users = usersQuery.data?.data ?? [];
  const activeCount = users.filter((u) => u.status === UserStatus.ACTIVE).length;

  const handleChangeRole = (userId: string, role: string): void => {
    logger.info({ component: 'admin', action: 'change-user-role', message: 'Changing user role', details: { userId, role } });
    setActionPending(userId);
    changeRoleMutation.mutate({ userId, role });
  };

  const handleDeactivate = (userId: string): void => {
    logger.info({ component: 'admin', action: 'deactivate-user', message: 'Deactivating user', details: { userId } });
    setActionPending(userId);
    deactivateMutation.mutate(userId);
  };

  return {
    t,
    user: user ?? null,
    actionPending,
    users,
    activeCount,
    usersQuery: {
      isLoading: usersQuery.isLoading,
      isError: usersQuery.isError,
    },
    healthQuery: {
      isLoading: healthQuery.isLoading,
      isError: healthQuery.isError,
      data: healthQuery.data,
    },
    handleChangeRole,
    handleDeactivate,
    isRoleChangePending: changeRoleMutation.isPending && actionPending !== null,
    isDeactivatePending: deactivateMutation.isPending && actionPending !== null,
  };
}
