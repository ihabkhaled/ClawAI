import { Activity, MoreVertical, Pencil, Plug, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';

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
import {
  formatShortDateTime,
  getConnectorStatusDotTone,
  getConnectorStatusLabelKey,
} from '@/utilities';

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
  const dotTone = getConnectorStatusDotTone(connector.status);
  const statusLabel = t(getConnectorStatusLabelKey(connector.status));

  return (
    <Card className="transition-colors hover:border-primary/50">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-lg',
              providerColor,
            )}
          >
            <Plug className="h-5 w-5" />
            <span
              aria-hidden="true"
              className={cn(
                'absolute -bottom-0.5 -right-0.5 inline-block h-3 w-3 rounded-full border-2 border-card',
                dotTone,
              )}
            />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-base">
              <Link href={ROUTES.CONNECTOR_DETAIL(connector.id)} className="hover:underline">
                {connector.name}
              </Link>
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{providerName}</span>
              <span aria-hidden="true">•</span>
              <span>{statusLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="hidden text-xs sm:inline-flex">
            {modelCount === 1
              ? t('connectors.oneModel', { count: modelCount })
              : t('connectors.manyModels', { count: modelCount })}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">{t('admin.colActions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
        </div>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary" className="text-xs sm:hidden">
          {modelCount === 1
            ? t('connectors.oneModel', { count: modelCount })
            : t('connectors.manyModels', { count: modelCount })}
        </Badge>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTest(connector.id)}
            disabled={isTestPending}
            className="h-8"
          >
            <Activity className="me-1.5 h-3.5 w-3.5" />
            {isTestPending ? t('connectors.testingConnection') : t('connectors.testConnection')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSync(connector.id)}
            disabled={isSyncPending}
            className="h-8"
          >
            <RefreshCw className={cn('me-1.5 h-3.5 w-3.5', isSyncPending && 'animate-spin')} />
            {isSyncPending ? t('connectors.syncing') : t('connectors.syncModels')}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t('connectors.updatedAt', { date: formatShortDateTime(connector.updatedAt) })}
        </p>
      </CardContent>
    </Card>
  );
}
