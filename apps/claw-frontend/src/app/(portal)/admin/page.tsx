'use client';

import { ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';

import { AccessDenied } from '@/components/admin/access-denied';
import { RecentAuditEvents } from '@/components/admin/recent-audit-events';
import { UsersContent } from '@/components/admin/users-content';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/constants';
import { UserRole } from '@/enums';
import { useAdminPage } from '@/hooks/admin/use-admin-page';

export default function AdminPage(): React.ReactElement {
  const {
    t,
    user,
    users,
    plans,
    actionPending,
    activeCount,
    usersQuery,
    handleChangeRole,
    handleDeactivate,
    handleReactivate,
    handleAssignPlan,
    handleUpdateUser,
    isRoleChangePending,
    isDeactivatePending,
    isReactivatePending,
    isAssignPlanPending,
    isUpdateUserPending,
  } = useAdminPage();

  if (user && user.role !== UserRole.ADMIN) {
    return <AccessDenied t={t} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.title')} description={t('admin.description')} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground h-5 w-5" aria-hidden="true" />
              <CardTitle className="text-lg">{t('admin.userStats')}</CardTitle>
            </div>
            <CardDescription>{t('admin.userStatsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('admin.totalUsers')}</span>
                <span className="font-medium">{users.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('admin.activeUsers')}</span>
                <span className="font-medium">{activeCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-muted-foreground h-5 w-5" aria-hidden="true" />
              <CardTitle className="text-lg">{t('admin.platformHealth')}</CardTitle>
            </div>
            <CardDescription>{t('admin.platformHealthLinkDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4 text-sm">
              {t('admin.platformHealthLinkBody')}
            </p>
            <Button asChild variant="outline">
              <Link href={ROUTES.DASHBOARD}>{t('admin.viewSystemHealth')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <RecentAuditEvents />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t('admin.userManagement')}</h2>

        <UsersContent
          isLoading={usersQuery.isLoading}
          isError={usersQuery.isError}
          users={users}
          plans={plans}
          pendingId={actionPending}
          onChangeRole={handleChangeRole}
          onDeactivate={handleDeactivate}
          onReactivate={handleReactivate}
          onAssignPlan={handleAssignPlan}
          onUpdateUser={handleUpdateUser}
          isRoleChangePending={isRoleChangePending}
          isDeactivatePending={isDeactivatePending}
          isReactivatePending={isReactivatePending}
          isAssignPlanPending={isAssignPlanPending}
          isUpdateUserPending={isUpdateUserPending}
          t={t}
        />
      </div>
    </div>
  );
}
