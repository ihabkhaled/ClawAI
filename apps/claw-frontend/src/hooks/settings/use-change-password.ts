import { useMutation } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { preferencesService } from '@/services/preferences/preferences.service';
import type { ChangePasswordRequest } from '@/types';
import { logger, showToast } from '@/utilities';

export function useChangePassword(onSuccess?: () => void) {
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) => {
      logger.info({ component: 'settings', action: 'change-password', message: 'Changing password' });
      return preferencesService.changePassword(data);
    },
    onSuccess: () => {
      logger.info({ component: 'settings', action: 'change-password-success', message: 'Password changed' });
      showToast.success({ title: t('settings.passwordChanged') });
      onSuccess?.();
    },
    onError: (error: Error) => {
      logger.error({ component: 'settings', action: 'change-password-error', message: error.message });
      showToast.apiError(error, t('settings.passwordChangeFailed'));
    },
  });

  return {
    changePassword: mutation.mutate,
    isPending: mutation.isPending,
  };
}
