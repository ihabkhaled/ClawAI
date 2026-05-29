import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { UserRole, UserStatus } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { plansRepository } from '@/repositories/admin/plans.repository';
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

  const plansQuery = useQuery({
    queryKey: queryKeys.adminPlans.lists(),
    queryFn: () => plansRepository.list(),
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

  const assignPlanMutation = useMutation({
    mutationFn: ({ userId, planId }: { userId: string; planId: string }) =>
      plansRepository.assignUser(userId, planId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.planAssigned') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.planAssignFailed'));
    },
  });

  const users = usersQuery.data?.data ?? [];
  const plans = plansQuery.data ?? [];
  const activeCount = users.filter((u) => u.status === UserStatus.ACTIVE).length;

  const handleChangeRole = (userId: string, role: string): void => {
    logger.info({
      component: 'admin',
      action: 'change-user-role',
      message: 'Changing user role',
      details: { userId, role },
    });
    setActionPending(userId);
    changeRoleMutation.mutate({ userId, role });
  };

  const handleDeactivate = (userId: string): void => {
    logger.info({
      component: 'admin',
      action: 'deactivate-user',
      message: 'Deactivating user',
      details: { userId },
    });
    setActionPending(userId);
    deactivateMutation.mutate(userId);
  };

  const handleAssignPlan = (userId: string, planId: string): void => {
    logger.info({
      component: 'admin',
      action: 'assign-plan',
      message: 'Assigning plan to user',
      details: { userId, planId },
    });
    setActionPending(userId);
    assignPlanMutation.mutate({ userId, planId });
  };

  return {
    t,
    user: user ?? null,
    actionPending,
    users,
    plans,
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
    handleAssignPlan,
    isRoleChangePending: changeRoleMutation.isPending && actionPending !== null,
    isDeactivatePending: deactivateMutation.isPending && actionPending !== null,
    isAssignPlanPending: assignPlanMutation.isPending && actionPending !== null,
  };
}
