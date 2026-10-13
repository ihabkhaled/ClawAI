import type { PluginInstallView } from '@claw/shared-types';
import { useCallback } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { UsePluginSettingsSheetReturn } from '@/types/plugin-installs.types';
import { pluginErrorKey } from '@/utilities/plugin-installs.utility';

import { usePluginConsentActions } from './use-plugin-consent-actions';
import { usePluginCredentialActions } from './use-plugin-credential-actions';
import { usePluginEntry } from './use-plugin-entry';
import { usePluginSettingsDraft } from './use-plugin-settings-draft';
import { usePluginToast } from './use-plugin-toast';
import { useUpdatePluginInstall } from './use-update-plugin-install';

/** The settings sheet of one install: schema form, write-only key, and per-tool consent. */
export function usePluginSettingsSheet(install: PluginInstallView): UsePluginSettingsSheetReturn {
  const { t } = useTranslation();
  const entry = usePluginEntry(install.slug);
  const update = useUpdatePluginInstall();
  const notify = usePluginToast();
  const credential = usePluginCredentialActions(install.id);
  const consent = usePluginConsentActions(install.id);
  const { mutate } = update;

  const onValid = useCallback(
    (settings: Record<string, unknown>): void => {
      mutate(
        { id: install.id, body: { settings } },
        { onSuccess: () => notify('pluginsInstall.toast.saved') },
      );
    },
    [install.id, mutate, notify],
  );
  const form = usePluginSettingsDraft(install, entry.data?.settingsSchema, onValid);
  const failure = update.error ?? credential.credentialError ?? consent.consentError;

  return {
    t,
    plugin: entry.data,
    isLoading: entry.isLoading,
    ...form,
    ...credential,
    ...consent,
    isSaving: update.isPending,
    errorMessage: failure === null ? null : t(pluginErrorKey(failure)),
  };
}
