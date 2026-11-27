import { useCallback, useMemo } from 'react';

import { Permission } from '@/enums';
import { useSaveSecuritySettings } from '@/hooks/admin/use-save-security-settings';
import { useSecuritySettingsForm } from '@/hooks/admin/use-security-settings-form';
import { useSystemSettings } from '@/hooks/admin/use-system-settings';
import { usePermissions } from '@/hooks/auth/use-permissions';
import { useTranslation } from '@/lib/i18n';
import type { UseAdminSecuritySettingsPageReturn } from '@/types/admin-security-settings.types';
import { showToast } from '@/utilities';
import {
  groupSecuritySettingFields,
  readSecretStatus,
} from '@/utilities/admin-security-settings.utility';

/**
 * Controller of /admin/security/sign-up. Reading needs ADMIN_SYSTEM_VIEW (the
 * route guard); saving needs ADMIN_CREDIT_MANAGE, the permission
 * `PUT /admin/settings/:key` enforces, so a viewer is shown a read-only form
 * rather than a button that 403s.
 */
export function useAdminSecuritySettingsPage(): UseAdminSecuritySettingsPageReturn {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { settings, isLoading, isError, refetch } = useSystemSettings();
  const form = useSecuritySettingsForm(settings);
  const { save: saveChanges, isSaving } = useSaveSecuritySettings();
  const { validate } = form;
  const groups = useMemo(() => groupSecuritySettingFields(), []);

  const save = useCallback((): void => {
    const changes = validate();
    if (changes === null) {
      showToast.error({ title: t('adminSecurity.invalid') });
      return;
    }
    if (changes.length > 0) {
      saveChanges(changes);
    }
  }, [saveChanges, t, validate]);

  return {
    t,
    isLoading,
    isError,
    retry: refetch,
    canEdit: can(Permission.ADMIN_CREDIT_MANAGE),
    groups,
    values: form.values,
    errors: form.errors,
    secretStatus: readSecretStatus(settings ?? []),
    hasChanges: form.changes.length > 0,
    isSaving,
    setValue: form.setValue,
    save,
  };
}
