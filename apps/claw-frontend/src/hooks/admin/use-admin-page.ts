import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { UserRole, UserStatus } from '@/enums';
import type { EmailVerificationFilter } from '@/enums/email-verification-filter.enum';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { plansRepository } from '@/repositories/admin/plans.repository';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { healthRepository } from '@/repositories/health/health.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  AdminUserUpdateMutationVariables,
  AdminUserUpdateRequest,
  UseAdminPageReturn,
} from '@/types';
import { logger, showToast } from '@/utilities';

export function useAdminPage(): UseAdminPageReturn {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');

  const userQuery = {
    page,
    limit: 20,
    search: search || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
    planId: planFilter || undefined,
    verification: (verificationFilter || undefined) as EmailVerificationFilter | undefined,
  };

  const usersQuery = useQuery({
    queryKey: [...queryKeys.admin.users, userQuery],
    queryFn: () => auditRepository.getAdminUsers(userQuery),
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

  const reactivateMutation = useMutation({
    mutationFn: (userId: string) => auditRepository.reactivateUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.userReactivated') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.userReactivateFailed'));
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
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: AdminUserUpdateMutationVariables) =>
      auditRepository.updateUser(userId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.userUpdated') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.userUpdateFailed'));
    },
  });
  const temporaryPasswordMutation = useMutation({
    mutationFn: (userId: string) => auditRepository.issueTemporaryPassword(userId),
    onSettled: () => setActionPending(null),
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

  const handleReactivate = (userId: string): void => {
    logger.info({
      component: 'admin',
      action: 'reactivate-user',
      message: 'Reactivating user',
      details: { userId },
    });
    setActionPending(userId);
    reactivateMutation.mutate(userId);
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
  const handleUpdateUser = (userId: string, data: AdminUserUpdateRequest): void => {
    setActionPending(userId);
    updateUserMutation.mutate({ userId, data });
  };
  const handleTemporaryPassword = (userId: string): void => {
    setActionPending(userId);
    temporaryPasswordMutation.mutate(userId);
  };

  return {
    t,
    user: user ?? null,
    actionPending,
    users,
    usersMeta: usersQuery.data?.meta,
    page,
    setPage,
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    roleFilter,
    setRoleFilter: (value: string) => {
      setRoleFilter(value);
      setPage(1);
    },
    statusFilter,
    setStatusFilter: (value: string) => {
      setStatusFilter(value);
      setPage(1);
    },
    planFilter,
    setPlanFilter: (value: string) => {
      setPlanFilter(value);
      setPage(1);
    },
    verificationFilter,
    setVerificationFilter: (value: string) => {
      setVerificationFilter(value);
      setPage(1);
    },
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
    handleReactivate,
    handleAssignPlan,
    handleUpdateUser,
    handleTemporaryPassword,
    isRoleChangePending: changeRoleMutation.isPending && actionPending !== null,
    isDeactivatePending: deactivateMutation.isPending && actionPending !== null,
    isReactivatePending: reactivateMutation.isPending && actionPending !== null,
    isAssignPlanPending: assignPlanMutation.isPending && actionPending !== null,
    isUpdateUserPending: updateUserMutation.isPending && actionPending !== null,
    isTemporaryPasswordPending: temporaryPasswordMutation.isPending && actionPending !== null,
  };
}
