import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { queryKeys } from '@/repositories/shared/query-keys';
import { preferencesService } from '@/services/preferences/preferences.service';
import type { UpdatePreferencesRequest } from '@/types';
import { logger, showToast } from '@/utilities';

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: UpdatePreferencesRequest) => preferencesService.updatePreferences(data),
    onSuccess: () => {
      logger.info({ component: 'settings', action: 'update-preferences', message: 'Preferences updated' });
      showToast.success({ title: t('settings.preferencesUpdated') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
    onError: (error: Error) => {
      logger.error({ component: 'settings', action: 'update-preferences-error', message: error.message });
      showToast.apiError(error, t('settings.preferencesUpdateFailed'));
    },
  });

  return {
    updatePreferences: mutation.mutate,
    updatePreferencesAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
