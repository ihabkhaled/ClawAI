'use client';

import { Link2, Pencil, ShieldCheck, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkspaceProviderAppConfigStatus } from '@/enums/workspace-provider-app-config-status.enum';
import { WorkspaceProviderAuthMode } from '@/enums/workspace-provider-auth-mode.enum';
import type { AppConfigRowProps } from '@/types';
import { formatOptionalIsoDate } from '@/utilities/date.utility';

export function AppConfigRow({
  config,
  onTest,
  onDelete,
  onConnect,
  onEdit,
  isTestPending,
  isDeletePending,
  isConnectPending,
  canManage,
  t,
}: AppConfigRowProps): React.ReactElement {
  const canConnect =
    config.authMode === WorkspaceProviderAuthMode.OAUTH2 &&
    config.status === WorkspaceProviderAppConfigStatus.READY;
  return (
    <tr className="border-t max-md:block max-md:rounded-lg max-md:border">
      <td
        data-label={t('workspaceProviders.appConfigs.columns.name')}
        className="max-md:before:text-muted-foreground px-4 py-2 text-sm font-medium max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:font-normal max-md:before:content-[attr(data-label)]"
      >
        {config.name}
      </td>
      <td
        data-label={t('workspaceProviders.appConfigs.columns.provider')}
        className="max-md:before:text-muted-foreground px-4 py-2 text-sm max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        <Badge variant="outline">{config.provider}</Badge>
      </td>
      <td
        data-label={t('workspaceProviders.appConfigs.columns.authMode')}
        className="max-md:before:text-muted-foreground px-4 py-2 text-sm max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        <Badge variant="outline">{config.authMode}</Badge>
      </td>
      <td
        data-label={t('workspaceProviders.appConfigs.columns.status')}
        className="max-md:before:text-muted-foreground px-4 py-2 text-sm max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        <Badge
          variant={
            config.status === WorkspaceProviderAppConfigStatus.READY ? 'default' : 'secondary'
          }
        >
          {config.status}
        </Badge>
      </td>
      <td
        data-label={t('workspaceProviders.appConfigs.columns.secret')}
        className="text-muted-foreground px-4 py-2 text-sm max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {config.hasSecret ? t('workspaceProviders.appConfigs.secretStored') : '—'}
      </td>
      <td
        data-label={t('workspaceProviders.appConfigs.columns.lastValidated')}
        className="text-muted-foreground px-4 py-2 text-sm max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:before:text-xs max-md:before:content-[attr(data-label)]"
      >
        {formatOptionalIsoDate(config.lastValidatedAt)}
      </td>
      <td
        data-label={t('workspaceProviders.appConfigs.columns.actions')}
        className="px-4 py-2 text-right max-md:block max-md:border-t"
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canManage ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isTestPending}
              onClick={() => onTest(config.id, config.provider)}
            >
              <ShieldCheck className="h-4 w-4" />
              {t('workspaceProviders.appConfigs.test')}
            </Button>
          ) : null}
          {canConnect ? (
            <Button
              variant="default"
              size="sm"
              disabled={isConnectPending}
              onClick={() => {
                void onConnect(config.id, config.provider);
              }}
            >
              <Link2 className="h-4 w-4" />
              {t('workspaceProviders.appConfigs.connect')}
            </Button>
          ) : null}
          {canManage ? (
            <Button variant="ghost" size="sm" onClick={() => onEdit(config)}>
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
          {canManage ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={isDeletePending}
              onClick={() => onDelete(config.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
