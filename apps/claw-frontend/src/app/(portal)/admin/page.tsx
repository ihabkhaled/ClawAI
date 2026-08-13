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
    usersMeta,
    page,
    setPage,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    planFilter,
    setPlanFilter,
    verificationFilter,
    setVerificationFilter,
    plans,
    actionPending,
    activeCount,
    usersQuery,
    handleChangeRole,
    handleDeactivate,
    handleReactivate,
    handleAssignPlan,
    handleUpdateUser,
    handleTemporaryPassword,
    isRoleChangePending,
    isDeactivatePending,
    isReactivatePending,
    isAssignPlanPending,
    isUpdateUserPending,
    isTemporaryPasswordPending,
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

        <div className="grid gap-3 md:grid-cols-5">
          <input
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
            aria-label={t('common.search')}
            placeholder={t('common.search')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
            aria-label={t('admin.colRole')}
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="">{t('admin.colRole')}</option>
            <option value="ADMIN">{t('admin.roleAdmin')}</option>
            <option value="OPERATOR">{t('admin.roleOperator')}</option>
            <option value="VIEWER">{t('admin.roleViewer')}</option>
            <option value="USER">USER</option>
          </select>
          <select
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
            aria-label={t('admin.colStatus')}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">{t('admin.colStatus')}</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING">PENDING</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
          <select
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
            aria-label={t('admin.planColumn')}
            value={planFilter}
            onChange={(event) => setPlanFilter(event.target.value)}
          >
            <option value="">{t('admin.planColumn')}</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
          <select
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
            aria-label={t('admin.colStatus')}
            value={verificationFilter}
            onChange={(event) => setVerificationFilter(event.target.value)}
          >
            <option value="">{t('admin.colEmail')}</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="UNVERIFIED">UNVERIFIED</option>
          </select>
        </div>

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
          onTemporaryPassword={handleTemporaryPassword}
          isRoleChangePending={isRoleChangePending}
          isDeactivatePending={isDeactivatePending}
          isReactivatePending={isReactivatePending}
          isAssignPlanPending={isAssignPlanPending}
          isUpdateUserPending={isUpdateUserPending}
          isTemporaryPasswordPending={isTemporaryPasswordPending}
          t={t}
        />
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            {t('common.previous')}
          </Button>
          <span className="text-muted-foreground text-sm">
            {page} / {usersMeta?.totalPages ?? 1}
          </span>
          <Button
            variant="outline"
            disabled={page >= (usersMeta?.totalPages ?? 1)}
            onClick={() => setPage((value) => value + 1)}
          >
            {t('common.next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
