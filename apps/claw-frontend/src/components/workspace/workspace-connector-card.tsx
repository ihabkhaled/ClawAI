import { Activity, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/constants';
import type { WorkspaceConnectorCardProps } from '@/types/component.types';

import { WorkspaceConnectorStatusBadge } from './workspace-connector-status-badge';

export function WorkspaceConnectorCard({
  connector,
  onDelete,
  onHealthCheck,
  onSync,
  isDeleting,
  isCheckingHealth,
  isSyncing,
  t,
}: WorkspaceConnectorCardProps): React.ReactElement {
  const lastSync = connector.lastSyncAt
    ? new Date(connector.lastSyncAt).toLocaleString()
    : t('workspaceConnectors.never');

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={ROUTES.WORKSPACE_CONNECTOR_DETAIL(connector.id)}
            className="flex-1 truncate hover:underline"
          >
            <CardTitle className="flex items-center gap-2 text-base leading-tight">
              {connector.name}
              <ExternalLink className="size-3 text-muted-foreground" />
            </CardTitle>
          </Link>
          <WorkspaceConnectorStatusBadge connector={connector} t={t} />
        </div>
        <p className="text-sm text-muted-foreground">{connector.provider}</p>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 pb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('workspaceConnectors.lastSync')}</span>
          <span className="font-medium tabular-nums">{lastSync}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('workspaceConnectors.syncRuns')}</span>
          <span className="font-medium tabular-nums">{connector._count.syncRuns}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('workspaceConnectors.healthEvents')}</span>
          <span className="font-medium tabular-nums">{connector._count.healthEvents}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('workspaceConnectors.status')}</span>
          <span className="font-medium">
            {connector.isEnabled
              ? t('workspaceConnectors.enabled')
              : t('workspaceConnectors.disabled')}
          </span>
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onHealthCheck(connector.id)}
          disabled={isCheckingHealth}
          className="flex-1"
        >
          <Activity className="mr-1 size-3" />
          {t('workspaceConnectors.testHealth')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSync(connector.id)}
          disabled={isSyncing}
          className="flex-1"
        >
          <RefreshCw className="mr-1 size-3" />
          {t('workspaceConnectors.triggerSync')}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(connector.id)}
          disabled={isDeleting}
          className="shrink-0 text-destructive hover:text-destructive"
          aria-label={t('common.delete')}
        >
          <Trash2 className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
