'use client';

import { LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HealthStatus, ServiceStatus } from '@/enums';
import { useDashboardPage } from '@/hooks/dashboard/use-dashboard-page';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getHealthStatusColor } from '@/utilities';

export default function DashboardPage() {
  const {
    statCards,
    quickActions,
    isLoading,
    healthStatus,
    healthServices,
    healthSummary,
  } = useDashboardPage();
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        actions={
          <div className="flex items-center gap-2 text-muted-foreground">
            <LayoutDashboard className="h-5 w-5" />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '-' : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {quickActions.map((action) => (
            <Card key={action.label} className="transition-colors hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <action.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{action.label}</CardTitle>
                </div>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">System Health</h2>
        {healthStatus === null ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Service Status</CardTitle>
              <CardDescription>
                {isLoading
                  ? 'Checking service health...'
                  : 'Could not reach the health aggregator. Please verify the health service is running.'}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Service Status</CardTitle>
                  <CardDescription>
                    {healthSummary
                      ? `${String(healthSummary.up)} of ${String(healthSummary.total)} services operational`
                      : 'Loading...'}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'capitalize',
                    healthStatus === HealthStatus.HEALTHY && 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
                    healthStatus === HealthStatus.DEGRADED && 'border-amber-500 text-amber-600 dark:text-amber-400',
                    healthStatus === HealthStatus.UNHEALTHY && 'border-destructive text-destructive',
                  )}
                >
                  {healthStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {healthServices.map((svc) => (
                  <div key={svc.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-block h-2 w-2 rounded-full',
                          getHealthStatusColor(svc.status === ServiceStatus.UP ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY),
                        )}
                      />
                      <span>{svc.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {svc.responseTimeMs !== null ? `${String(svc.responseTimeMs)}ms` : 'unreachable'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
