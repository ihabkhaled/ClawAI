import type { PluginInstallView } from '@claw/shared-types';
import { useState } from 'react';

/**
 * Which install the settings sheet and the uninstall dialog are about. Only the id is kept;
 * the row is looked up in the live list, so a refetch updates the open sheet instead of
 * leaving a stale copy on screen.
 */
export function useInstalledPluginSelection(installs: PluginInstallView[]) {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [uninstallId, setUninstallId] = useState<string | null>(null);
  const find = (id: string | null): PluginInstallView | undefined =>
    installs.find((install) => install.id === id);

  return {
    settingsFor: find(settingsId),
    uninstallFor: find(uninstallId),
    openSettings: (install: PluginInstallView) => setSettingsId(install.id),
    closeSettings: () => setSettingsId(null),
    askUninstall: (install: PluginInstallView) => setUninstallId(install.id),
    cancelUninstall: () => setUninstallId(null),
  };
}
