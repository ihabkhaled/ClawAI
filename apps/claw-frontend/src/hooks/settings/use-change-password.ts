import { useMutation } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { preferencesService } from '@/services/preferences/preferences.service';
import type { ChangePasswordRequest } from '@/types';
import { showToast } from '@/utilities';

export function useChangePassword(onSuccess?: () => void) {
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) => preferencesService.changePassword(data),
    onSuccess: () => {
      showToast.success({ title: t('settings.passwordChanged') });
      onSuccess?.();
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('settings.passwordChangeFailed'));
    },
  });

  return {
    changePassword: mutation.mutate,
    isPending: mutation.isPending,
  };
}
