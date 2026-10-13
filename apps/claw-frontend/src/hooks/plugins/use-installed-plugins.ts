import type { PluginInstallView } from '@claw/shared-types';

import { useTranslation } from '@/lib/i18n';
import type { UseInstalledPluginsReturn } from '@/types/plugin-installs.types';
import { pluginErrorKey } from '@/utilities/plugin-installs.utility';

import { useInstalledPluginSelection } from './use-installed-plugin-selection';
import { usePluginInstalls } from './use-plugin-installs';
import { useUninstallPlugin } from './use-uninstall-plugin';
import { useUpdatePluginInstall } from './use-update-plugin-install';

/** The Installed page: the list, the enable toggle, and the uninstall confirm. */
export function useInstalledPlugins(): UseInstalledPluginsReturn {
  const { t } = useTranslation();
  const list = usePluginInstalls();
  const selection = useInstalledPluginSelection(list.installs);
  const update = useUpdatePluginInstall();
  const uninstall = useUninstallPlugin();
  const failure = update.error ?? uninstall.error;
  const { uninstallFor, cancelUninstall } = selection;

  return {
    t,
    ...list,
    ...selection,
    confirmUninstall: () => {
      if (uninstallFor !== undefined) {
        uninstall.mutate(uninstallFor.id, { onSuccess: cancelUninstall });
      }
    },
    isUninstalling: uninstall.isPending,
    pendingId: update.isPending ? (update.variables?.id ?? null) : null,
    setEnabled: (install: PluginInstallView, enabled: boolean) => {
      update.mutate({ id: install.id, body: { enabled } });
    },
    errorMessage: failure === null ? null : t(pluginErrorKey(failure)),
  };
}
