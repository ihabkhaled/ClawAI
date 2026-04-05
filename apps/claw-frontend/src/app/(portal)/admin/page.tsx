'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';

import { UserTable } from '@/components/admin/user-table';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HealthStatus, ServiceStatus, UserRole, UserStatus } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { healthRepository } from '@/repositories/health/health.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { AdminUser, AggregatedHealth } from '@/types';
import { getHealthStatusColor, showToast } from '@/utilities';

function HealthCardContent({
  isLoading,
  isError,
  health,
  t,
}: {
  isLoading: boolean;
  isError: boolean;
  health: AggregatedHealth | null;
  t: (key: string) => string;
}): React.ReactElement {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('admin.checkingServices')}</p>;
  }

  if (isError || !health) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('admin.healthUnreachable')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {health.services.map((svc) => (
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
            {svc.responseTimeMs !== null ? `${String(svc.responseTimeMs)}ms` : 'down'}
          </span>
        </div>
      ))}
    </div>
  );
}

function UsersContent({
  isLoading,
  isError,
  users,
  onChangeRole,
  onDeactivate,
  isRoleChangePending,
  isDeactivatePending,
  t,
}: {
  isLoading: boolean;
  isError: boolean;
  users: AdminUser[];
  onChangeRole: (userId: string, role: string) => void;
  onDeactivate: (userId: string) => void;
  isRoleChangePending: boolean;
  isDeactivatePending: boolean;
  t: (key: string) => string;
}): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('admin.loadingUsers')} />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={Users}
        title={t('admin.loadUsersFailed')}
        description={t('admin.loadUsersFailedDesc')}
      />
    );
  }

  return (
    <UserTable
      users={users}
      onChangeRole={onChangeRole}
      onDeactivate={onDeactivate}
      isRoleChangePending={isRoleChangePending}
      isDeactivatePending={isDeactivatePending}
    />
  );
}

export default function AdminPage() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [actionPending, setActionPending] = useState<string | null>(null);

  if (user && user.role !== UserRole.ADMIN) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">{t('common.accessDenied')}</p>
      </div>
    );
  }

  const usersQuery = useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: () => auditRepository.getAdminUsers(),
  });

  const healthQuery = useQuery({
    queryKey: queryKeys.health.aggregated,
    queryFn: () => healthRepository.getAggregatedHealth(),
    refetchInterval: 30_000,
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      auditRepository.updateUserRole(userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.userRoleUpdated') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.userRoleUpdateFailed'));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => auditRepository.deactivateUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
      showToast.success({ description: t('admin.userDeactivated') });
    },
    onError: (err: unknown) => {
      setActionPending(null);
      showToast.apiError(err, t('admin.userDeactivateFailed'));
    },
  });

  const users = usersQuery.data?.data ?? [];
  const activeCount = users.filter((u) => u.status === UserStatus.ACTIVE).length;

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
          onChangeRole={(userId, role) => {
            setActionPending(userId);
            changeRoleMutation.mutate({ userId, role });
          }}
          onDeactivate={(userId) => {
            setActionPending(userId);
            deactivateMutation.mutate(userId);
          }}
          isRoleChangePending={changeRoleMutation.isPending && actionPending !== null}
          isDeactivatePending={deactivateMutation.isPending && actionPending !== null}
          t={t}
        />
      </div>
    </div>
  );
}
