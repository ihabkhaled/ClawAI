import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  BanUserRequest,
  SetUserPasswordRequest,
  SetUserPasswordResponse,
  UserSecurityHandlers,
} from '@/types';
import { logger, showToast } from '@/utilities';

/**
 * Ban, unban and set-password for the admin users page (ADR-200).
 *
 * The password and the generated password are never logged: the log line names
 * the user id and the mode only. A generated password lives in the reply the
 * caller gets back and nowhere else - no query cache, no store.
 */
export function useAdminUserSecurityMutations(): UserSecurityHandlers {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const refreshUsers = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
  };

  const banMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: BanUserRequest }) =>
      auditRepository.banUser(userId, data),
    onSuccess: () => {
      refreshUsers();
      showToast.success({ description: t('admin.userBanned') });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, t('admin.userBanFailed'), { translate: t });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => auditRepository.unbanUser(userId),
    onSuccess: () => {
      refreshUsers();
      showToast.success({ description: t('admin.userUnbanned') });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, t('admin.userUnbanFailed'), { translate: t });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: SetUserPasswordRequest }) =>
      auditRepository.setUserPassword(userId, data),
    onSuccess: () => {
      refreshUsers();
      showToast.success({ description: t('admin.setPasswordSucceeded') });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, t('admin.setPasswordFailed'), { translate: t });
    },
  });

  return {
    onBan: async (userId, data) => {
      logger.info({
        component: 'admin',
        action: 'ban-user',
        message: 'Banning user',
        details: { userId, unit: data.unit },
      });
      try {
        await banMutation.mutateAsync({ userId, data });
        return true;
      } catch {
        return false;
      }
    },
    onUnban: (userId) => {
      logger.info({
        component: 'admin',
        action: 'unban-user',
        message: 'Unbanning user',
        details: { userId },
      });
      unbanMutation.mutate(userId);
    },
    onSetPassword: async (userId, data): Promise<SetUserPasswordResponse | null> => {
      logger.info({
        component: 'admin',
        action: 'set-user-password',
        message: 'Setting user password',
        details: { userId, mode: data.mode },
      });
      try {
        return await passwordMutation.mutateAsync({ userId, data });
      } catch {
        return null;
      }
    },
    isBanPending: banMutation.isPending,
    isUnbanPending: unbanMutation.isPending,
    isSetPasswordPending: passwordMutation.isPending,
  };
}
