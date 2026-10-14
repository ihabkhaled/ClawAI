'use client';

import { AlertTriangle, Plus, Server } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PLUGIN_SERVER_SKELETON_KEYS,
  PLUGIN_SERVERS_GRID_CLASSES,
} from '@/constants/plugin-servers.constants';
import { ROUTES } from '@/constants/routes.constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import { PluginServerCapState } from '@/enums/plugin-server-cap-state.enum';
import { PluginsNavTab } from '@/enums/plugins-nav-tab.enum';
import { usePluginServersPage } from '@/hooks/plugins/use-plugin-servers-page';

import { AddPluginServerDialog } from './add-plugin-server-dialog';
import { PluginServerCapBadge } from './plugin-server-cap-badge';
import { PluginServerCard } from './plugin-server-card';
import { PluginServerRemoveDialog } from './plugin-server-remove-dialog';
import { PluginServerToolsDialog } from './plugin-server-tools-dialog';
import { PluginsNav } from './plugins-nav';

/** My MCP servers: the user's own remote servers, the plan cap, and the add, tools and remove flows. */
export function PluginServersPage(): React.ReactElement {
  const page = usePluginServersPage();
  const { t, cap } = page;
  const planHasNone = cap.state === PluginServerCapState.Disabled;

  return (
    <div>
      <PageHeader title={t('plugins.title')} description={t('pluginsServers.description')} />
      <PluginsNav active={PluginsNavTab.Servers} t={t} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PluginServerCapBadge cap={cap} t={t} />
        <Button type="button" disabled={!cap.canAdd} onClick={page.openAdd}>
          <Plus className="me-2 h-4 w-4" aria-hidden="true" />
          {t('pluginsServers.add')}
        </Button>
      </div>

      {planHasNone ? (
        <div className="mb-4">
          <Alert
            variant={AlertVariant.Info}
            description={t('pluginsServers.planNone')}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.PRICING}>{t('pluginsServers.seePlans')}</Link>
              </Button>
            }
          />
        </div>
      ) : null}
      {cap.state === PluginServerCapState.Limited && !cap.canAdd ? (
        <div className="mb-4">
          <Alert
            variant={AlertVariant.Warning}
            description={t('pluginsServers.errors.limitReached')}
          />
        </div>
      ) : null}
      {page.errorMessage === null ? null : (
        <div className="mb-4">
          <Alert variant={AlertVariant.Error} description={page.errorMessage} />
        </div>
      )}

      {page.isLoading ? (
        <div
          className={PLUGIN_SERVERS_GRID_CLASSES}
          role="status"
          aria-label={t('pluginsServers.loading')}
        >
          {PLUGIN_SERVER_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="min-h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {!page.isLoading && page.isError ? (
        <EmptyState
          icon={AlertTriangle}
          title={t('pluginsServers.errorTitle')}
          description={t('pluginsServers.errorDescription')}
          variant={EmptyStateVariant.Compact}
          action={
            <Button variant="outline" size="sm" onClick={page.retry}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : null}

      {!page.isLoading && !page.isError && page.servers.length === 0 ? (
        <EmptyState
          icon={Server}
          title={t('pluginsServers.emptyTitle')}
          description={t('pluginsServers.emptyDescription')}
          variant={EmptyStateVariant.Compact}
        />
      ) : null}

      {!page.isLoading && !page.isError && page.servers.length > 0 ? (
        <ul className={PLUGIN_SERVERS_GRID_CLASSES}>
          {page.servers.map((server) => (
            <li key={server.id} className="min-w-0">
              <PluginServerCard
                server={server}
                isPending={page.pendingId === server.id}
                onToggle={page.setEnabled}
                onTools={page.openTools}
                onRemove={page.askRemove}
                t={t}
              />
            </li>
          ))}
        </ul>
      ) : null}

      <AddPluginServerDialog open={page.addOpen} onClose={page.closeAdd} t={t} />
      <PluginServerToolsDialog server={page.toolsFor} onClose={page.closeTools} t={t} />
      <PluginServerRemoveDialog
        server={page.removeFor}
        busy={page.isRemoving}
        onConfirm={page.confirmRemove}
        onCancel={page.cancelRemove}
        t={t}
      />
    </div>
  );
}
