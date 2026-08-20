import type { ReactElement } from 'react';

import type { SyncHealthDashboardViewProps } from '../../types/sync-health-component.types';
import { compareConnectorsByFreshness } from '../../utilities/sync-band-label.utility';

import { SyncHealthRow } from './sync-health-row';

export function SyncHealthDashboardView({
  dashboard,
  t,
}: SyncHealthDashboardViewProps): ReactElement {
  const orderedRows = [...dashboard.connectors].sort(compareConnectorsByFreshness);

  return (
    <div className="space-y-6">
      <section className="border-border bg-card rounded-lg border p-4">
        <h2 className="mb-3 text-base font-semibold">
          {t('workspaceSync.dashboard.scheduler_title')}
        </h2>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">
              {t('workspaceSync.dashboard.scheduler_enabled')}
            </dt>
            <dd className="font-medium">
              {dashboard.scheduler.enabled ? t('common.yes') : t('common.no')}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('workspaceSync.dashboard.last_tick')}</dt>
            <dd className="font-medium">{dashboard.scheduler.lastTickAt ?? t('common.never')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('workspaceSync.dashboard.active_runs')}</dt>
            <dd className="font-medium">{dashboard.scheduler.activeRuns}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('workspaceSync.dashboard.dlq_backlog')}</dt>
            <dd className="font-medium">{dashboard.scheduler.dlqBacklog}</dd>
          </div>
        </dl>
      </section>
      <section className="border-border bg-card rounded-lg border">
        <h2 className="border-border border-b p-4 text-base font-semibold">
          {t('workspaceSync.dashboard.connectors_title')}
        </h2>
        <div className="max-w-full md:overflow-x-auto">
          <table className="w-full text-left max-md:block">
            <thead className="bg-muted/30 max-md:hidden">
              <tr>
                <th className="text-muted-foreground px-3 py-2 text-xs font-medium">
                  {t('workspaceSync.dashboard.col.connector')}
                </th>
                <th className="text-muted-foreground px-3 py-2 text-xs font-medium">
                  {t('workspaceSync.dashboard.col.freshness')}
                </th>
                <th className="text-muted-foreground px-3 py-2 text-xs font-medium">
                  {t('workspaceSync.dashboard.col.last_sync')}
                </th>
                <th className="text-muted-foreground px-3 py-2 text-xs font-medium">
                  {t('workspaceSync.dashboard.col.cadence')}
                </th>
                <th className="text-muted-foreground px-3 py-2 text-xs font-medium">
                  {t('workspaceSync.dashboard.col.success_rate')}
                </th>
                <th className="text-muted-foreground px-3 py-2 text-xs font-medium">
                  {t('workspaceSync.dashboard.col.avg_duration')}
                </th>
                <th className="text-muted-foreground px-3 py-2 text-xs font-medium">
                  {t('workspaceSync.dashboard.col.status')}
                </th>
              </tr>
            </thead>
            <tbody className="max-md:block max-md:space-y-3 max-md:p-3">
              {orderedRows.map((row) => (
                <SyncHealthRow key={row.connectorId} row={row} t={t} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
