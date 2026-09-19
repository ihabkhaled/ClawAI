import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { queryKeys } from '@/repositories/shared/query-keys';
import { preferencesService } from '@/services/preferences/preferences.service';
import { useAuthStore } from '@/stores/auth.store';
import type { ChangePasswordRequest, User } from '@/types';
import { logger, showToast } from '@/utilities';

export function useChangePassword(onSuccess?: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) => {
      logger.info({
        component: 'settings',
        action: 'change-password',
        message: 'Changing password',
      });
      return preferencesService.changePassword(data);
    },
    onSuccess: () => {
      logger.info({
        component: 'settings',
        action: 'change-password-success',
        message: 'Password changed',
      });
      // Clear the forced-rotation flag everywhere the UI reads it, NOW.
      //
      // The banner and the redirect guard both read `mustChangePassword` from
      // the cached profile (`auth.me`, 5-minute staleTime) and from the auth
      // store. Neither was touched here, so after a successful change the
      // banner stayed up and every navigation bounced back to the change form
      // until a full page reload refetched the profile. Written first, then
      // refetched, so the UI is correct immediately and confirmed after.
      queryClient.setQueryData<User | undefined>(queryKeys.auth.me, (current) =>
        current === undefined ? current : { ...current, mustChangePassword: false },
      );
      const stored = useAuthStore.getState().user;
      if (stored !== null && stored !== undefined) {
        useAuthStore.getState().setUser({ ...stored, mustChangePassword: false });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      showToast.success({ title: t('settings.passwordChanged') });
      onSuccess?.();
    },
    onError: (error: Error) => {
      logger.error({
        component: 'settings',
        action: 'change-password-error',
        message: error.message,
      });
      showToast.apiError(error, t('settings.passwordChangeFailed'));
    },
  });

  return {
    changePassword: mutation.mutate,
    isPending: mutation.isPending,
  };
}
