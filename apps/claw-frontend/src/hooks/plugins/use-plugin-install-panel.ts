import { useMemo } from 'react';

import { PlanFeature } from '@/enums/plan-feature.enum';
import { usePlanFeatures } from '@/hooks/auth/use-plan-features';
import { useEntitlements } from '@/hooks/plans/use-entitlements';
import { useTranslation } from '@/lib/i18n';
import type { UsePluginInstallPanelReturn } from '@/types/plugin-installs.types';
import type { PluginCatalogDetail } from '@/types/plugins.types';
import { isUnavailable, resolveInstallGate } from '@/utilities/plugin-installs.utility';

import { usePluginInstallDialog } from './use-plugin-install-dialog';
import { usePluginInstalls } from './use-plugin-installs';

/**
 * The detail page's install state: this user's install of the plugin (if any), whether
 * Install is allowed and why not, and the dialog. The gate only explains; the server
 * enforces the plan, the cap and the kill switch again on the install call.
 */
export function usePluginInstallPanel(plugin: PluginCatalogDetail): UsePluginInstallPanelReturn {
  const { t } = useTranslation();
  const { installs } = usePluginInstalls();
  const { entitlements } = useEntitlements();
  const { has } = usePlanFeatures();
  const dialog = usePluginInstallDialog(plugin);
  const install = installs.find((candidate) => candidate.slug === plugin.slug);
  const limit = entitlements?.plan?.limits.maxInstalledPlugins;

  const gate = useMemo(
    () =>
      resolveInstallGate({
        alreadyInstalled: install !== undefined || plugin.installed,
        globallyDisabled: install !== undefined && isUnavailable(install),
        planAllows: has(PlanFeature.ALLOW_PLUGINS),
        cap: limit,
        installedCount: installs.length,
      }),
    [has, install, installs.length, limit, plugin.installed],
  );

  return { t, install, gate, limit, ...dialog };
}
