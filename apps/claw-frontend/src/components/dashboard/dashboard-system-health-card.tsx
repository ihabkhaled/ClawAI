import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_HEALTH_STATUS_BADGE_STYLES } from '@/constants/dashboard-status-styles.constants';
import { HealthStatus, ServiceStatus } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { DashboardSystemHealthCardProps } from '@/types';
import { getHealthStatusColor } from '@/utilities';

export function DashboardSystemHealthCard({
  healthStatus,
  healthServices,
  healthSummary,
  isLoading,
}: DashboardSystemHealthCardProps): React.ReactElement {
  const { t } = useTranslation();

  if (healthStatus === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.serviceStatus')}</CardTitle>
          <CardDescription>
            {isLoading ? t('dashboard.checkingHealth') : t('dashboard.healthUnreachable')}
          </CardDescription>
        </CardHeader>
        {isLoading ? (
          <CardContent>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        ) : null}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t('dashboard.serviceStatus')}</CardTitle>
            <CardDescription>
              {healthSummary
                ? t('dashboard.servicesOperational', {
                    up: String(healthSummary.up),
                    total: String(healthSummary.total),
                  })
                : t('common.loading')}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn('capitalize', DASHBOARD_HEALTH_STATUS_BADGE_STYLES[healthStatus])}
          >
            {healthStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {healthServices.map((svc) => (
            <div
              key={svc.name}
              className="flex items-center justify-between gap-3 text-xs sm:text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    'inline-block h-2 w-2 shrink-0 rounded-full',
                    getHealthStatusColor(
                      svc.status === ServiceStatus.UP
                        ? HealthStatus.HEALTHY
                        : HealthStatus.UNHEALTHY,
                    ),
                  )}
                />
                <span className="truncate">{svc.name}</span>
              </div>
              <span className="shrink-0 text-muted-foreground">
                {svc.responseTimeMs !== null
                  ? t('dashboard.responseTimeMs', { ms: String(svc.responseTimeMs) })
                  : t('dashboard.unreachable')}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
