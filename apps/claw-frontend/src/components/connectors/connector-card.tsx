import { Activity, MoreVertical, Pencil, Plug, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { StatusBadge } from '@/components/common/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PROVIDER_DISPLAY_NAMES, PROVIDER_ICON_COLORS, ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ConnectorCardProps } from '@/types';
import { formatShortDateTime } from '@/utilities';

export function ConnectorCard({
  connector,
  onTest,
  onSync,
  onEdit,
  onDelete,
  isTestPending,
  isSyncPending,
}: ConnectorCardProps) {
  const { t } = useTranslation();
  const modelCount = connector._count?.models ?? 0;
  const providerColor =
    PROVIDER_ICON_COLORS[connector.provider] ??
    'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
  const providerName = PROVIDER_DISPLAY_NAMES[connector.provider] ?? connector.provider;

  return (
    <Card className="transition-colors hover:border-primary/50">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn('flex h-10 w-10 items-center justify-center rounded-lg', providerColor)}
          >
            <Plug className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">
              <Link href={ROUTES.CONNECTOR_DETAIL(connector.id)} className="hover:underline">
                {connector.name}
              </Link>
            </CardTitle>
            <p className="text-xs text-muted-foreground">{providerName}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">{t('admin.colActions')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onTest(connector.id)} disabled={isTestPending}>
              <Activity className="me-2 h-4 w-4" />
              {t('connectors.testConnection')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSync(connector.id)} disabled={isSyncPending}>
              <RefreshCw className="me-2 h-4 w-4" />
              {t('connectors.syncModels')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(connector)}>
              <Pencil className="me-2 h-4 w-4" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(connector.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="me-2 h-4 w-4" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <StatusBadge status={connector.status} />
          {connector.isEnabled ? (
            <Badge variant="secondary" className="text-xs">
              {t('connectors.enabled')}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {t('connectors.disabled')}
            </Badge>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {modelCount === 1
              ? t('connectors.oneModel', { count: modelCount })
              : t('connectors.manyModels', { count: modelCount })}
          </span>
          <span>
            {t('connectors.updatedAt', { date: formatShortDateTime(connector.updatedAt) })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
