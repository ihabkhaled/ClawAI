import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { plansRepository } from '@/repositories/admin/plans.repository';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  AdminCreateUserRequest,
  AdminUserUpdateMutationVariables,
  AdminUserUpdateRequest,
  UseAdminUserMutationsReturn,
} from '@/types';
import { logger, showToast } from '@/utilities';

function useChangeRoleMutation(setActionPending: (value: string | null) => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      auditRepository.updateUserRole(userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.userRoleUpdated') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.userRoleUpdateFailed'), { translate: t });
    },
  });
}

function useDeactivateMutation(setActionPending: (value: string | null) => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => auditRepository.deactivateUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.userDeactivated') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.userDeactivateFailed'), { translate: t });
    },
  });
}

function useReactivateMutation(setActionPending: (value: string | null) => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => auditRepository.reactivateUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.userReactivated') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.userReactivateFailed'), { translate: t });
    },
  });
}

function useAssignPlanMutation(setActionPending: (value: string | null) => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, planId }: { userId: string; planId: string }) =>
      plansRepository.assignUser(userId, planId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.planAssigned') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.planAssignFailed'), { translate: t });
    },
  });
}

function useUpdateUserMutation(setActionPending: (value: string | null) => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: AdminUserUpdateMutationVariables) =>
      auditRepository.updateUser(userId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.userUpdated') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.userUpdateFailed'), { translate: t });
    },
  });
}

function useTemporaryPasswordMutation(setActionPending: (value: string | null) => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => auditRepository.issueTemporaryPassword(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.temporaryPasswordIssued') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.temporaryPasswordFailed'), { translate: t });
    },
  });
}

function useCreateUserMutation(onCreated: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AdminCreateUserRequest) => auditRepository.createUser(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      onCreated();
      showToast.success({ description: t('admin.createUserSucceeded') });
    },
    // Minting an ADMIN requires a super-administrator actor, so this is the one
    // create path that can refuse on authority rather than on validation —
    // SUPER_ADMIN_REQUIRED must reach the user translated.
    onError: (err: unknown) => {
      showToast.apiError(err, t('admin.createUserFailed'), { translate: t });
    },
  });
}

function useIdentityHandlers(
  actionPending: string | null,
  setActionPending: (value: string | null) => void,
) {
  const changeRoleMutation = useChangeRoleMutation(setActionPending);
  const deactivateMutation = useDeactivateMutation(setActionPending);
  const reactivateMutation = useReactivateMutation(setActionPending);

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

  return {
    actionPending,
    handleChangeRole,
    handleDeactivate,
    handleReactivate,
    isRoleChangePending: changeRoleMutation.isPending && actionPending !== null,
    isDeactivatePending: deactivateMutation.isPending && actionPending !== null,
    isReactivatePending: reactivateMutation.isPending && actionPending !== null,
  };
}

function useAccountHandlers(
  actionPending: string | null,
  setActionPending: (value: string | null) => void,
) {
  const assignPlanMutation = useAssignPlanMutation(setActionPending);
  const updateUserMutation = useUpdateUserMutation(setActionPending);
  const temporaryPasswordMutation = useTemporaryPasswordMutation(setActionPending);

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
    actionPending,
    handleAssignPlan,
    handleUpdateUser,
    handleTemporaryPassword,
    isAssignPlanPending: assignPlanMutation.isPending && actionPending !== null,
    isUpdateUserPending: updateUserMutation.isPending && actionPending !== null,
    isTemporaryPasswordPending: temporaryPasswordMutation.isPending && actionPending !== null,
  };
}

export function useAdminUserMutations(
  onUserCreated: () => void = () => undefined,
): UseAdminUserMutationsReturn {
  const [actionPending, setActionPending] = useState<string | null>(null);
  const identity = useIdentityHandlers(actionPending, setActionPending);
  const account = useAccountHandlers(actionPending, setActionPending);
  const createUserMutation = useCreateUserMutation(onUserCreated);

  return {
    actionPending,
    handleCreateUser: (data: AdminCreateUserRequest) => {
      logger.info({
        component: 'admin',
        action: 'create-user',
        message: 'Creating user',
        details: { role: data.role },
      });
      createUserMutation.mutate(data);
    },
    isCreateUserPending: createUserMutation.isPending,
    handleChangeRole: identity.handleChangeRole,
    handleDeactivate: identity.handleDeactivate,
    handleReactivate: identity.handleReactivate,
    handleAssignPlan: account.handleAssignPlan,
    handleUpdateUser: account.handleUpdateUser,
    handleTemporaryPassword: account.handleTemporaryPassword,
    isRoleChangePending: identity.isRoleChangePending,
    isDeactivatePending: identity.isDeactivatePending,
    isReactivatePending: identity.isReactivatePending,
    isAssignPlanPending: account.isAssignPlanPending,
    isUpdateUserPending: account.isUpdateUserPending,
    isTemporaryPasswordPending: account.isTemporaryPasswordPending,
  };
}
