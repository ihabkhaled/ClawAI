'use client';

import { EditUserDialog } from '@/components/admin/edit-user-dialog';
import { TemporaryPasswordDialog } from '@/components/admin/temporary-password-dialog';
import { DataTable } from '@/components/common/data-table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserRole, UserStatus } from '@/enums';
import { useUserTableState } from '@/hooks/admin/use-user-table-state';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { AdminUser, DataTableColumn, UserTableProps } from '@/types';
import { resolveRoleBadgeVariant, resolveUserInitial } from '@/utilities/admin-user.utility';

export function UserTable({
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
}: UserTableProps): React.ReactElement {
  const {
    editingUserId,
    setEditingUserId,
    handleRoleSelect,
    editUser,
    openEditUser,
    closeEditUser,
    submitEditUser,
    temporaryPasswordUserId,
    requestTemporaryPassword,
    cancelTemporaryPassword,
    confirmTemporaryPassword,
  } = useUserTableState();
  const { t } = useTranslation();
  const activePlans = plans.filter((plan) => plan.isActive);

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: 'username',
      header: t('admin.colUsername'),
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {resolveUserInitial(user)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{user.username}</span>
        </div>
      ),
      renderMobileTitle: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {resolveUserInitial(user)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate">{user.username}</span>
            <span className="text-muted-foreground truncate text-xs font-normal">{user.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('admin.colEmail'),
      render: (user) => <span className="text-muted-foreground text-sm">{user.email}</span>,
    },
    {
      key: 'role',
      header: t('admin.colRole'),
      render: (user) =>
        editingUserId === user.id ? (
          <Select
            defaultValue={user.role}
            onValueChange={(value) => {
              handleRoleSelect(user.id, value, onChangeRole);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserRole.ADMIN}>{t('admin.roleAdmin')}</SelectItem>
              <SelectItem value={UserRole.OPERATOR}>{t('admin.roleOperator')}</SelectItem>
              <SelectItem value={UserRole.VIEWER}>{t('admin.roleViewer')}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge
            variant={resolveRoleBadgeVariant(user.role)}
            className="cursor-pointer"
            onClick={() => {
              if (!user.isSuperAdmin) {
                setEditingUserId(user.id);
              }
            }}
          >
            {user.role}
          </Badge>
        ),
    },
    {
      key: 'status',
      header: t('admin.colStatus'),
      render: (user) => {
        const isActive = user.status === UserStatus.ACTIVE;
        return (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                isActive ? 'bg-success' : 'bg-muted-foreground/40',
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'text-sm font-medium',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {user.status}
            </span>
          </div>
        );
      },
    },
    {
      key: 'plan',
      header: t('admin.planColumn'),
      render: (user) => (
        <Select
          value={user.activePlanId ?? undefined}
          disabled={user.isSuperAdmin || (isAssignPlanPending && pendingId === user.id)}
          onValueChange={(value) => onAssignPlan(user.id, value)}
        >
          <SelectTrigger className="w-[160px]" aria-label={t('admin.assignPlan')}>
            <SelectValue placeholder={t('admin.noPlan')} />
          </SelectTrigger>
          <SelectContent>
            {activePlans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'joined',
      header: t('admin.colJoined'),
      render: (user) => (
        <span className="text-muted-foreground text-sm">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('admin.colActions'),
      className: 'text-end',
      // Suspension is reversible, so the action cell follows the account's
      // status instead of offering a single button that greys out forever. A
      // suspended user previously had no action available here at all, which
      // made the admin page a one-way door and forced a database round trip to
      // undo an ordinary mistake.
      //
      // Reactivate appears only for SUSPENDED, because that is precisely what
      // it undoes. A PENDING account has not been suspended, so it keeps the
      // Deactivate action rather than being silently approved by a button
      // labelled "reactivate".
      render: (user) => (
        <div className="touch:grid touch:w-full touch:grid-cols-2 flex min-w-0 flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-auto py-1.5"
            disabled={user.isSuperAdmin || (isTemporaryPasswordPending && pendingId === user.id)}
            onClick={() => requestTemporaryPassword(user.id)}
          >
            <span className="min-w-0 text-center leading-tight whitespace-normal">
              {t('admin.issueTemporaryPassword')}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-auto py-1.5"
            disabled={user.isSuperAdmin || isUpdateUserPending}
            onClick={() => openEditUser(user)}
          >
            <span className="text-center leading-tight whitespace-normal">
              {t('admin.editUser')}
            </span>
          </Button>
          {user.status === UserStatus.SUSPENDED ? (
            <Button
              variant="outline"
              size="sm"
              disabled={user.isSuperAdmin || isReactivatePending || isRoleChangePending}
              onClick={() => onReactivate(user.id)}
            >
              {t('admin.reactivate')}
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              disabled={user.isSuperAdmin || isDeactivatePending || isRoleChangePending}
              onClick={() => onDeactivate(user.id)}
            >
              {t('admin.deactivate')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        keyExtractor={(user) => user.id}
        emptyMessage={t('admin.noUsers')}
        mobileTitleKey="username"
      />
      <EditUserDialog
        open={editUser !== null}
        user={editUser}
        isSaving={isUpdateUserPending}
        isRotating={isTemporaryPasswordPending}
        onClose={closeEditUser}
        onSave={(userId, data) => submitEditUser(userId, data, onUpdateUser)}
        onRotatePassword={requestTemporaryPassword}
        t={t}
      />
      <TemporaryPasswordDialog
        open={temporaryPasswordUserId !== null}
        isPending={
          isTemporaryPasswordPending &&
          temporaryPasswordUserId !== null &&
          pendingId === temporaryPasswordUserId
        }
        onCancel={cancelTemporaryPassword}
        onConfirm={() => confirmTemporaryPassword(onTemporaryPassword)}
        t={t}
      />
    </>
  );
}
