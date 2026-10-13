import type { PluginInstallView } from '@claw/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { PluginSettingsDraft } from '@/types/plugin-installs.types';
import {
  buildSettingsFields,
  initialSettingsDraft,
  validateSettingsDraft,
} from '@/utilities/plugin-settings-form.utility';

/**
 * The settings form for one install: fields from the manifest schema, a draft seeded from
 * the saved settings, and a save that validates before it sends anything.
 */
export function usePluginSettingsDraft(
  install: PluginInstallView,
  schema: unknown,
  onValid: (values: Record<string, unknown>) => void,
) {
  const fields = useMemo(() => buildSettingsFields(schema), [schema]);
  const [draft, setDraft] = useState<PluginSettingsDraft>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraft(initialSettingsDraft(fields, install.settings));
    setErrors({});
  }, [fields, install.id, install.settings]);

  const setDraftValue = useCallback((key: string, value: string | boolean): void => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const save = useCallback((): void => {
    const result = validateSettingsDraft(fields, draft);
    setErrors(result.errors);
    if (Object.keys(result.errors).length === 0) {
      onValid(result.values);
    }
  }, [draft, fields, onValid]);

  return { fields, draft, errors, setDraftValue, save };
}
