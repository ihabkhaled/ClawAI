import { Users } from 'lucide-react';

import { UserTable } from '@/components/admin/user-table';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { UsersContentProps } from '@/types';

export function UsersContent({
  isLoading,
  isError,
  users,
  onChangeRole,
  onDeactivate,
  isRoleChangePending,
  isDeactivatePending,
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
      onChangeRole={onChangeRole}
      onDeactivate={onDeactivate}
      isRoleChangePending={isRoleChangePending}
      isDeactivatePending={isDeactivatePending}
    />
  );
}
