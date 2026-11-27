import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { queryKeys } from '@/repositories/shared/query-keys';
import { securitySettingsService } from '@/services/admin/security-settings.service';
import type {
  SecuritySettingChange,
  UseSaveSecuritySettingsReturn,
} from '@/types/admin-security-settings.types';
import { showToast } from '@/utilities';

/** PUTs the changed security.* keys, then reloads the settings so the form re-seeds. */
export function useSaveSecuritySettings(): UseSaveSecuritySettingsReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (changes: SecuritySettingChange[]) => securitySettingsService.save(changes),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.systemSettings });
      if (result.failed.length === 0) {
        showToast.success({ title: t('adminSecurity.saved') });
      } else {
        showToast.error({ title: t('adminSecurity.saveFailed') });
      }
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('adminSecurity.saveFailed'), { translate: t });
    },
  });
  return { save: mutation.mutate, isSaving: mutation.isPending };
}
