import { useMutation } from '@tanstack/react-query';

import type { SecuritySettingKey } from '@/enums/security-setting-key.enum';
import { useInvalidateSecuritySettings } from '@/hooks/admin/use-invalidate-security-settings';
import { useTranslation } from '@/lib/i18n';
import { securitySettingsService } from '@/services/admin/security-settings.service';
import type { UseRemoveSecuritySecretReturn } from '@/types/admin-security-settings.types';
import { showToast } from '@/utilities';

/**
 * Removes a secret saved on the Sign-up protection page (an empty box is never
 * sent by save, so this is the only way to clear one). Sent at once, no
 * confirmation dialog; on success it reloads the same queries a save does.
 */
export function useRemoveSecuritySecret(): UseRemoveSecuritySecretReturn {
  const { t } = useTranslation();
  const invalidate = useInvalidateSecuritySettings();
  const mutation = useMutation({
    mutationFn: (key: SecuritySettingKey) => securitySettingsService.removeSecret(key),
    onSuccess: () => {
      invalidate();
      showToast.success({
        title: t('adminSecurity.removeSecret.removed'),
        description: t('adminSecurity.removeSecret.removedDetail'),
      });
    },
    onError: (error: Error) => {
      showToast.apiError(error, t('adminSecurity.removeSecret.failed'), { translate: t });
    },
  });
  return {
    removeSecret: mutation.mutate,
    removingKey: mutation.isPending ? (mutation.variables ?? null) : null,
  };
}
