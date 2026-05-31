'use client';

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
  onAssignPlan,
  isRoleChangePending,
  isDeactivatePending,
  isAssignPlanPending,
}: UserTableProps): React.ReactElement {
  const { editingUserId, setEditingUserId, handleRoleSelect } = useUserTableState();
  const { t } = useTranslation();
  const activePlans = plans.filter((plan) => plan.isActive);

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: 'username',
      header: t('admin.colUsername'),
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {resolveUserInitial(user)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{user.username}</span>
        </div>
      ),
      renderMobileTitle: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {resolveUserInitial(user)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate">{user.username}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('admin.colEmail'),
      render: (user) => <span className="text-sm text-muted-foreground">{user.email}</span>,
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
            onClick={() => setEditingUserId(user.id)}
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
          disabled={isAssignPlanPending && pendingId === user.id}
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
        <span className="text-sm text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('admin.colActions'),
      className: 'text-end',
      render: (user) => (
        <Button
          variant="destructive"
          size="sm"
          disabled={isDeactivatePending || isRoleChangePending || user.status !== UserStatus.ACTIVE}
          onClick={() => onDeactivate(user.id)}
        >
          {t('admin.deactivate')}
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      keyExtractor={(user) => user.id}
      emptyMessage={t('admin.noUsers')}
      mobileTitleKey="username"
    />
  );
}
