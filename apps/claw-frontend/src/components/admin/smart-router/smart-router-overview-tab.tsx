import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { SMART_ROUTER_MODE_LABEL_KEYS } from '@/constants/smart-router-admin.constants';
import type { SmartRouterOverviewTabProps } from '@/types/smart-router-admin.types';
import { formatOptionalIsoDate } from '@/utilities';

import { SmartRouterStatusBadge } from './smart-router-status-badge';

export function SmartRouterOverviewTab({
  published,
  isLoading,
  isError,
  error,
  isTogglePending,
  onToggleEnabled,
  t,
}: SmartRouterOverviewTabProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('common.loading')} />;
  }

  if (isError) {
    return (
      <div
        className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm"
        role="alert"
      >
        {error?.message ?? t('common.error')}
      </div>
    );
  }

  if (published === null) {
    return (
      <p className="text-muted-foreground text-sm">{t('smartRouterAdmin.overview.noPublished')}</p>
    );
  }

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-2 sm:col-span-2">
          <div>
            <p className="text-sm font-medium">
              {t('smartRouterAdmin.overview.currentRevisionLabel')}
            </p>
            <p className="text-2xl font-bold tracking-tight">#{published.revision}</p>
          </div>
          <SmartRouterStatusBadge status={published.status} t={t} />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">
            {t('smartRouterAdmin.overview.modeLabel')}
          </p>
          <p className="text-sm">{t(SMART_ROUTER_MODE_LABEL_KEYS[published.mode])}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">
            {t('smartRouterAdmin.overview.entryCountLabel')}
          </p>
          <p className="text-sm">{published.entryCount}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">
            {t('smartRouterAdmin.overview.publishedAtLabel')}
          </p>
          <p className="text-sm">{formatOptionalIsoDate(published.publishedAt)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">
            {t('smartRouterAdmin.overview.publishedByLabel')}
          </p>
          <p className="text-sm">{published.publishedBy ?? t('common.unknown')}</p>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Switch
            checked={published.enabled}
            onCheckedChange={onToggleEnabled}
            disabled={isTogglePending}
            aria-label={
              published.enabled
                ? t('smartRouterAdmin.overview.disableAction')
                : t('smartRouterAdmin.overview.enableAction')
            }
          />
          <span className="text-sm">
            {t('smartRouterAdmin.overview.enabledToggleLabel')}:{' '}
            {published.enabled ? t('common.yes') : t('common.no')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
