import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SecuritySettingKey } from '@/enums/security-setting-key.enum';
import type {
  SecuritySettingErrors,
  SecuritySettingValues,
  SystemSettingView,
  UseSecuritySettingsFormReturn,
} from '@/types/admin-security-settings.types';
import {
  buildSecuritySettingValues,
  collectSecuritySettingChanges,
  validateSecuritySettings,
} from '@/utilities/admin-security-settings.utility';

/**
 * Field values of the Sign-up protection page. Re-seeded whenever the server
 * data changes (first load, and the refetch after a save), which is also what
 * empties the write-only secret boxes once a secret has been stored.
 */
export function useSecuritySettingsForm(
  settings: SystemSettingView[] | undefined,
): UseSecuritySettingsFormReturn {
  const baseline = useMemo(() => buildSecuritySettingValues(settings ?? []), [settings]);
  const [values, setValues] = useState<SecuritySettingValues>(baseline);
  const [errors, setErrors] = useState<SecuritySettingErrors>({});

  useEffect(() => {
    setValues(baseline);
    setErrors({});
  }, [baseline]);

  const setValue = useCallback((key: SecuritySettingKey, value: string): void => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }, []);

  const validate = useCallback(() => {
    const found = validateSecuritySettings(values);
    setErrors(found);
    return Object.keys(found).length > 0 ? null : collectSecuritySettingChanges(baseline, values);
  }, [baseline, values]);

  return {
    values,
    errors,
    changes: collectSecuritySettingChanges(baseline, values),
    setValue,
    validate,
  };
}
