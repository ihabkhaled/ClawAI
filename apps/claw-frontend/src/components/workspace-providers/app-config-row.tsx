'use client';

import { ShieldCheck, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkspaceProviderAppConfigStatus } from '@/enums/workspace-provider-app-config-status.enum';
import type { AppConfigRowProps } from '@/types';
import { formatOptionalIsoDate } from '@/utilities/date.utility';

export function AppConfigRow({
  config,
  onTest,
  onDelete,
  isTestPending,
  isDeletePending,
  t,
}: AppConfigRowProps): React.ReactElement {
  return (
    <tr className="border-t">
      <td className="px-4 py-2 text-sm font-medium">{config.name}</td>
      <td className="px-4 py-2 text-sm">
        <Badge variant="outline">{config.provider}</Badge>
      </td>
      <td className="px-4 py-2 text-sm">
        <Badge variant="outline">{config.authMode}</Badge>
      </td>
      <td className="px-4 py-2 text-sm">
        <Badge
          variant={
            config.status === WorkspaceProviderAppConfigStatus.READY ? 'default' : 'secondary'
          }
        >
          {config.status}
        </Badge>
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">
        {config.hasSecret ? t('workspaceProviders.appConfigs.secretStored') : '—'}
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">
        {formatOptionalIsoDate(config.lastValidatedAt)}
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isTestPending}
            onClick={() => onTest(config.id, config.provider)}
          >
            <ShieldCheck className="h-4 w-4" />
            {t('workspaceProviders.appConfigs.test')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isDeletePending}
            onClick={() => onDelete(config.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
