'use client';

import type { ReactElement } from 'react';

import { AccessDenied } from '@/components/admin/access-denied';
import { UserFilters } from '@/components/admin/user-filters';
import { UsersContent } from '@/components/admin/users-content';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/enums';
import { useAdminUsersPage } from '@/hooks/admin/use-admin-users-page';

export default function AdminUsersPage(): ReactElement {
  const admin = useAdminUsersPage();
  const totalPages = admin.usersMeta?.totalPages ?? 1;
  let content: ReactElement;
  if (admin.user && admin.user.role !== UserRole.ADMIN) {
    return <AccessDenied t={admin.t} />;
  }
  if (admin.usersQuery.isLoading) {
    content = <p>{admin.t('admin.loadingUsers')}</p>;
  } else if (admin.usersQuery.isError) {
    content = (
      <div role="alert" className="text-red-600">
        <p>{admin.t('admin.loadUsersFailedDesc')}</p>
        <Button onClick={admin.onRetry} variant="outline" className="mt-2">
          {admin.t('common.retry')}
        </Button>
      </div>
    );
  } else if (admin.users.length === 0) {
    content = <p>{admin.t('admin.noUsers')}</p>;
  } else {
    content = (
      <>
        <UsersContent
          isLoading={false}
          isError={false}
          users={admin.users}
          plans={admin.plans}
          actor={admin.actor}
          pendingId={admin.actionPending}
          onChangeRole={admin.handleChangeRole}
          onDeactivate={admin.handleDeactivate}
          onReactivate={admin.handleReactivate}
          onAssignPlan={admin.handleAssignPlan}
          onUpdateUser={admin.handleUpdateUser}
          onTemporaryPassword={admin.handleTemporaryPassword}
          isRoleChangePending={admin.isRoleChangePending}
          isDeactivatePending={admin.isDeactivatePending}
          isReactivatePending={admin.isReactivatePending}
          isAssignPlanPending={admin.isAssignPlanPending}
          isUpdateUserPending={admin.isUpdateUserPending}
          isTemporaryPasswordPending={admin.isTemporaryPasswordPending}
          t={admin.t}
        />
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => admin.setPage(admin.page - 1)}
            disabled={admin.page <= 1}
          >
            {admin.t('common.previous')}
          </Button>
          <span className="text-muted-foreground text-sm">
            {admin.page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => admin.setPage(admin.page + 1)}
            disabled={admin.page >= totalPages}
          >
            {admin.t('common.next')}
          </Button>
        </div>
      </>
    );
  }
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={admin.t('adminUsers.title')}
        description={admin.t('adminUsers.description')}
      />
      <UserFilters
        t={admin.t}
        plans={admin.plans}
        search={admin.search}
        setSearch={admin.setSearch}
        roleFilter={admin.roleFilter}
        setRoleFilter={admin.setRoleFilter}
        planFilter={admin.planFilter}
        setPlanFilter={admin.setPlanFilter}
        statusFilter={admin.statusFilter}
        setStatusFilter={admin.setStatusFilter}
        verificationFilter={admin.verificationFilter}
        setVerificationFilter={admin.setVerificationFilter}
      />
      {content}
    </div>
  );
}
