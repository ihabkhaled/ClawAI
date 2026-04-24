'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserRole } from '@/enums';
import { useUserTableState } from '@/hooks/admin/use-user-table-state';
import { useTranslation } from '@/lib/i18n';
import type { UserTableProps } from '@/types';

export function UserTable({
  users,
  onChangeRole,
  onDeactivate,
  isRoleChangePending,
  isDeactivatePending,
}: UserTableProps) {
  const { editingUserId, setEditingUserId, handleRoleSelect } = useUserTableState();
  const { t } = useTranslation();

  if (users.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md border text-sm text-muted-foreground">
        {t('admin.noUsers')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.colUsername')}</TableHead>
            <TableHead>{t('admin.colEmail')}</TableHead>
            <TableHead>{t('admin.colRole')}</TableHead>
            <TableHead>{t('admin.colStatus')}</TableHead>
            <TableHead>{t('admin.colJoined')}</TableHead>
            <TableHead className="text-end">{t('admin.colActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.username}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {editingUserId === user.id ? (
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
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setEditingUserId(user.id)}
                  >
                    {user.role}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {user.status}
                </Badge>
              </TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
              <TableCell className="text-end">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeactivatePending || isRoleChangePending || user.status !== 'ACTIVE'}
                  onClick={() => onDeactivate(user.id)}
                >
                  {t('admin.deactivate')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
