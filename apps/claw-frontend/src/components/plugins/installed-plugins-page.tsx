'use client';

import { AlertTriangle, Puzzle } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PLUGIN_INSTALLED_SKELETON_KEYS,
  PLUGINS_INSTALLED_GRID_CLASSES,
} from '@/constants/plugin-installs.constants';
import { ROUTES } from '@/constants/routes.constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import { PluginsNavTab } from '@/enums/plugins-nav-tab.enum';
import { useInstalledPlugins } from '@/hooks/plugins/use-installed-plugins';

import { InstalledPluginCard } from './installed-plugin-card';
import { PluginSettingsSheet } from './plugin-settings-sheet';
import { PluginUninstallDialog } from './plugin-uninstall-dialog';
import { PluginsNav } from './plugins-nav';

/** Installed: every plugin this user added, with its switch, settings and uninstall. */
export function InstalledPluginsPage(): React.ReactElement {
  const page = useInstalledPlugins();
  const { t } = page;

  return (
    <div>
      <PageHeader
        title={t('plugins.title')}
        description={t('pluginsInstall.installed.description')}
      />
      <PluginsNav active={PluginsNavTab.Installed} t={t} />

      {page.errorMessage === null ? null : (
        <div className="mb-4">
          <Alert variant={AlertVariant.Error} description={page.errorMessage} />
        </div>
      )}

      {page.isLoading ? (
        <div
          className={PLUGINS_INSTALLED_GRID_CLASSES}
          role="status"
          aria-label={t('plugins.loading')}
        >
          {PLUGIN_INSTALLED_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="min-h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {!page.isLoading && page.isError ? (
        <EmptyState
          icon={AlertTriangle}
          title={t('pluginsInstall.installed.errorTitle')}
          description={t('pluginsInstall.installed.errorDescription')}
          variant={EmptyStateVariant.Compact}
          action={
            <Button variant="outline" size="sm" onClick={page.retry}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : null}

      {!page.isLoading && !page.isError && page.installs.length === 0 ? (
        <EmptyState
          icon={Puzzle}
          title={t('pluginsInstall.installed.emptyTitle')}
          description={t('pluginsInstall.installed.emptyDescription')}
          variant={EmptyStateVariant.Compact}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.PLUGINS}>{t('pluginsInstall.installed.browse')}</Link>
            </Button>
          }
        />
      ) : null}

      {!page.isLoading && !page.isError && page.installs.length > 0 ? (
        <ul className={PLUGINS_INSTALLED_GRID_CLASSES}>
          {page.installs.map((install) => (
            <li key={install.id} className="min-w-0">
              <InstalledPluginCard
                install={install}
                isPending={page.pendingId === install.id}
                onToggle={page.setEnabled}
                onSettings={page.openSettings}
                onUninstall={page.askUninstall}
                t={t}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {page.settingsFor === undefined ? null : (
        <PluginSettingsSheet install={page.settingsFor} onClose={page.closeSettings} />
      )}
      <PluginUninstallDialog
        install={page.uninstallFor}
        busy={page.isUninstalling}
        onConfirm={page.confirmUninstall}
        onCancel={page.cancelUninstall}
        t={t}
      />
    </div>
  );
}
