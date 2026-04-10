'use client';

import { ShieldCheck, Users } from 'lucide-react';

import { AccessDenied } from '@/components/admin/access-denied';
import { HealthCardContent } from '@/components/admin/health-card-content';
import { UsersContent } from '@/components/admin/users-content';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HealthStatus, UserRole } from '@/enums';
import { useAdminPage } from '@/hooks/admin/use-admin-page';
import { cn } from '@/lib/utils';

export default function AdminPage() {
  const {
    t,
    user,
    users,
    activeCount,
    usersQuery,
    healthQuery,
    handleChangeRole,
    handleDeactivate,
    isRoleChangePending,
    isDeactivatePending,
  } = useAdminPage();

  if (user && user.role !== UserRole.ADMIN) {
    return <AccessDenied t={t} />;
  }

  return (
    <div>
      <PageHeader title={t('admin.title')} description={t('admin.description')} />

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{t('admin.userStats')}</CardTitle>
            </div>
            <CardDescription>{t('admin.userStatsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('admin.totalUsers')}</span>
                <span className="font-medium">{users.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('admin.activeUsers')}</span>
                <span className="font-medium">{activeCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">{t('admin.platformHealth')}</CardTitle>
              </div>
              {healthQuery.data ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'capitalize',
                    healthQuery.data.status === HealthStatus.HEALTHY && 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
                    healthQuery.data.status === HealthStatus.DEGRADED && 'border-amber-500 text-amber-600 dark:text-amber-400',
                    healthQuery.data.status === HealthStatus.UNHEALTHY && 'border-destructive text-destructive',
                  )}
                >
                  {healthQuery.data.status}
                </Badge>
              ) : null}
            </div>
            <CardDescription>{t('admin.systemStatusOverview')}</CardDescription>
          </CardHeader>
          <CardContent>
            <HealthCardContent
              isLoading={healthQuery.isLoading}
              isError={healthQuery.isError}
              health={healthQuery.data ?? null}
              t={t}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t('admin.userManagement')}</h2>

        <UsersContent
          isLoading={usersQuery.isLoading}
          isError={usersQuery.isError}
          users={users}
          onChangeRole={handleChangeRole}
          onDeactivate={handleDeactivate}
          isRoleChangePending={isRoleChangePending}
          isDeactivatePending={isDeactivatePending}
          t={t}
        />
      </div>
    </div>
  );
}
