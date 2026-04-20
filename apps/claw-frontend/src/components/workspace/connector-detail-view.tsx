'use client';

import { Activity, AlertTriangle, KeyRound, MessageSquare, Package, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { WorkspaceConnectorStatus } from '@/enums';
import type { ConnectorDetailViewProps } from '@/types';
import { formatOptionalIsoDate } from '@/utilities/date.utility';

import { ConnectorStatusBadge } from './connector-status-badge';

export function ConnectorDetailView({
  connector,
  syncRuns,
  healthEvents,
  recentObjects,
  isSyncing,
  isCheckingHealth,
  isDeleting,
  isAskingAi,
  onSync,
  onHealthCheck,
  onDelete,
  onAskAi,
  t,
}: ConnectorDetailViewProps): React.ReactElement {
  const isDisconnected =
    connector.status === WorkspaceConnectorStatus.DISCONNECTED ||
    connector.status === WorkspaceConnectorStatus.PENDING_AUTH;

  return (
    <div className="flex flex-col gap-6">
      {isDisconnected ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="font-medium text-destructive">{t('connectorDetail.reconnectTitle')}</p>
            <p className="mt-1 text-muted-foreground">{t('connectorDetail.reconnectDescription')}</p>
          </div>
          <Button asChild size="sm" variant="default">
            <Link href={ROUTES.WORKSPACE_APP_CONFIGS}>
              <KeyRound className="me-2 size-4" />
              {t('connectorDetail.reconnect')}
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{connector.name}</h2>
              <Badge variant="outline">{connector.provider}</Badge>
              <ConnectorStatusBadge status={connector.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('connectorDetail.syncRunsCount', { count: connector._count.syncRuns })} ·{' '}
              {t('connectorDetail.objectsCount', { count: recentObjects.length })} ·{' '}
              {t('connectorDetail.lastSync', {
                value: formatOptionalIsoDate(connector.lastSyncAt) ?? t('connectorDetail.never'),
              })}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="default" size="sm" disabled={isAskingAi} onClick={onAskAi}>
              <MessageSquare className="me-2 size-4" />
              {t('connectorDetail.askAi')}
            </Button>
            <Button variant="outline" size="sm" disabled={isCheckingHealth} onClick={onHealthCheck}>
              <Activity className="me-2 size-4" />
              {t('workspaceConnectors.testHealth')}
            </Button>
            <Button variant="outline" size="sm" disabled={isSyncing} onClick={onSync}>
              <RefreshCw className="me-2 size-4" />
              {t('workspaceConnectors.triggerSync')}
            </Button>
            <Button variant="ghost" size="sm" disabled={isDeleting} onClick={onDelete}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">{t('connectorDetail.recentObjects')}</h3>
        {recentObjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('connectorDetail.noObjects')}</p>
        ) : (
          <ul className="divide-y rounded border">
            {recentObjects.slice(0, 10).map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <Package className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate">{o.title ?? o.externalId}</span>
                <Badge variant="outline">{o.type}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">{t('connectorDetail.syncHistory')}</h3>
        {syncRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('connectorDetail.noSyncRuns')}</p>
        ) : (
          <ul className="divide-y rounded border">
            {syncRuns.map((run) => (
              <li
                key={run.id}
                className="flex flex-col gap-1 px-4 py-2 text-xs text-muted-foreground"
              >
                <div className="flex items-center gap-3">
                  <span className="w-32">{formatOptionalIsoDate(run.startedAt)}</span>
                  <Badge variant="outline">{run.status}</Badge>
                  <span className="flex-1">
                    {t('connectorDetail.syncRunLine', {
                      synced: run.objectsSynced ?? 0,
                      failed: run.objectsFailed ?? 0,
                    })}
                  </span>
                </div>
                {run.errorMessage !== null && run.errorMessage !== undefined ? (
                  <p className="ms-[8.5rem] text-destructive">{run.errorMessage}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">{t('connectorDetail.healthHistory')}</h3>
        {healthEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('connectorDetail.noHealthEvents')}</p>
        ) : (
          <ul className="divide-y rounded border">
            {healthEvents.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground"
              >
                <span className="w-32">{formatOptionalIsoDate(ev.checkedAt)}</span>
                <ConnectorStatusBadge status={ev.status} />
                <span className="flex-1 truncate">
                  {ev.errorMessage ?? t('connectorDetail.healthOk')}
                </span>
                {ev.latencyMs !== null ? <span>{ev.latencyMs}ms</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
