'use client';

import { useState } from 'react';

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
import type { UserTableProps } from '@/types';

export function UserTable({
  users,
  onChangeRole,
  onDeactivate,
  isRoleChangePending,
  isDeactivatePending,
}: UserTableProps) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  if (users.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md border text-sm text-muted-foreground">
        No users found
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-end">Actions</TableHead>
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
                      onChangeRole(user.id, value);
                      setEditingUserId(null);
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                      <SelectItem value={UserRole.OPERATOR}>Operator</SelectItem>
                      <SelectItem value={UserRole.VIEWER}>Viewer</SelectItem>
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
                  Deactivate
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
