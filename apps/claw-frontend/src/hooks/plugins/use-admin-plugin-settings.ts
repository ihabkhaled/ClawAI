import type { UpdatePluginSettingsRequest } from '@claw/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { pluginAdminRepository } from '@/repositories/plugins/plugin-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  PluginSettingsDraft,
  UseAdminPluginSettingsReturn,
} from '@/types/plugin-installs.types';
import { diffSettings, pluginErrorKey, settingsToDraft } from '@/utilities/plugin-installs.utility';

/** The PluginSetting rows. Only changed values are sent, and an invalid draft sends nothing. */
export function useAdminPluginSettings(): UseAdminPluginSettingsReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.plugins.adminSettings(),
    queryFn: () => pluginAdminRepository.listSettings(),
  });
  const settings = useMemo(() => query.data ?? [], [query.data]);
  const [draft, setDraft] = useState<PluginSettingsDraft>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: (values: UpdatePluginSettingsRequest) =>
      pluginAdminRepository.updateSettings(values),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.plugins.adminSettings() });
    },
  });

  useEffect(() => {
    setDraft(settingsToDraft(settings));
    setErrors({});
  }, [settings]);

  const pending = diffSettings(settings, draft);
  return {
    settings,
    draft,
    errors,
    setDraftValue: (key, value) => {
      setSaved(false);
      setDraft((current) => ({ ...current, [key]: value }));
    },
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => {
      void query.refetch();
    },
    isDirty: Object.keys(pending.values).length > 0 || Object.keys(pending.errors).length > 0,
    isSaving: mutation.isPending,
    save: () => {
      setErrors(pending.errors);
      if (Object.keys(pending.errors).length === 0) {
        mutation.mutate({ values: pending.values });
      }
    },
    reset: () => {
      setDraft(settingsToDraft(settings));
      setErrors({});
    },
    errorMessage: mutation.error === null ? null : t(pluginErrorKey(mutation.error)),
    saved,
  };
}
