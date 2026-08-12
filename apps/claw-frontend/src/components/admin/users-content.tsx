import { Users } from 'lucide-react';

import { UserTable } from '@/components/admin/user-table';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { UsersContentProps } from '@/types';

export function UsersContent({
  isLoading,
  isError,
  users,
  plans,
  pendingId,
  onChangeRole,
  onDeactivate,
  onReactivate,
  onAssignPlan,
  onUpdateUser,
  onTemporaryPassword,
  isRoleChangePending,
  isDeactivatePending,
  isReactivatePending,
  isAssignPlanPending,
  isUpdateUserPending,
  isTemporaryPasswordPending,
  t,
}: UsersContentProps): React.ReactElement {
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
      plans={plans}
      pendingId={pendingId}
      onChangeRole={onChangeRole}
      onDeactivate={onDeactivate}
      onReactivate={onReactivate}
      onAssignPlan={onAssignPlan}
      onUpdateUser={onUpdateUser}
      onTemporaryPassword={onTemporaryPassword}
      isRoleChangePending={isRoleChangePending}
      isDeactivatePending={isDeactivatePending}
      isReactivatePending={isReactivatePending}
      isAssignPlanPending={isAssignPlanPending}
      isUpdateUserPending={isUpdateUserPending}
      isTemporaryPasswordPending={isTemporaryPasswordPending}
    />
  );
}
