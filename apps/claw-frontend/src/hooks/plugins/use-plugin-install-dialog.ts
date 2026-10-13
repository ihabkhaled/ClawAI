import { useCallback, useState } from 'react';

import { PLUGIN_ERROR_KEY_CREDENTIAL_FAILED } from '@/constants/plugin-installs.constants';
import { useTranslation } from '@/lib/i18n';
import { PluginCredentialSaveError } from '@/services/plugins/plugin-credential-save-error';
import type { PluginCatalogDetail } from '@/types/plugins.types';
import { needsApiKey, pluginErrorKey } from '@/utilities/plugin-installs.utility';

import { useInstallPlugin } from './use-install-plugin';
import { usePluginCredentialMutations } from './use-plugin-credential-mutations';
import { usePluginToast } from './use-plugin-toast';

/**
 * The install dialog's own state: open or closed, the key being typed, and the install call.
 * The key lives only in this state. It is cleared on close and on success, and it is never
 * put in a query key, a toast or a log call. When the install worked and the key call did
 * not, the next confirm retries only the key call against that install.
 */
export function usePluginInstallDialog(plugin: PluginCatalogDetail) {
  const { t } = useTranslation();
  const notify = usePluginToast();
  const [isOpen, setIsOpen] = useState(false);
  const [credential, setCredential] = useState('');
  const { mutate, reset, isPending, error } = useInstallPlugin();
  const { save } = usePluginCredentialMutations();
  const needsCredential = needsApiKey(plugin.auth.kind);
  const keyRetryInstall = error instanceof PluginCredentialSaveError ? error.install : null;

  const close = useCallback((): void => {
    setIsOpen(false);
    setCredential('');
    reset();
    save.reset();
  }, [reset, save]);

  const confirm = useCallback((): void => {
    const key = credential.trim();
    if (keyRetryInstall !== null) {
      save.mutate(
        { id: keyRetryInstall.id, value: key },
        {
          onSuccess: () => {
            notify('pluginsInstall.toast.installed');
            close();
          },
        },
      );
      return;
    }
    mutate(
      { request: { slug: plugin.slug, version: plugin.version }, credential: key },
      { onSuccess: close },
    );
  }, [close, credential, keyRetryInstall, mutate, notify, plugin.slug, plugin.version, save]);

  const busy = isPending || save.isPending;
  let errorMessage: string | null = null;
  if (keyRetryInstall !== null) {
    errorMessage = t(PLUGIN_ERROR_KEY_CREDENTIAL_FAILED);
  } else if (error !== null) {
    errorMessage = t(pluginErrorKey(error));
  }

  return {
    isOpen,
    openDialog: () => setIsOpen(true),
    closeDialog: close,
    credential,
    setCredential,
    needsCredential,
    canConfirm: !busy && (!needsCredential || credential.trim().length > 0),
    isInstalling: busy,
    errorMessage,
    confirm,
  };
}
