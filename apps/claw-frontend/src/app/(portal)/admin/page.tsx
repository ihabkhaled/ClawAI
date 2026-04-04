"use client";

import { useState } from "react";
import { ShieldCheck, Users } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PageHeader } from "@/components/common/page-header";
import { UserTable } from "@/components/admin/user-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auditRepository } from "@/repositories/audit/audit.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [actionPending, setActionPending] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: () => auditRepository.getAdminUsers(),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      auditRepository.updateUserRole(userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => auditRepository.deactivateUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      setActionPending(null);
    },
  });

  const users = usersQuery.data?.data ?? [];
  const activeCount = users.filter((u) => u.status === "ACTIVE").length;

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Platform administration and user management"
      />

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">User Stats</CardTitle>
            </div>
            <CardDescription>
              Overview of platform users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Users
                </span>
                <span className="font-medium">{users.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Active Users
                </span>
                <span className="font-medium">{activeCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Platform Health</CardTitle>
            </div>
            <CardDescription>
              System status overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Service Status
                </span>
                <span className="font-medium text-green-600">Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">User Management</h2>

        {usersQuery.isLoading ? (
          <LoadingSpinner label="Loading users..." />
        ) : usersQuery.isError ? (
          <EmptyState
            icon={Users}
            title="Failed to load users"
            description="Could not fetch user list. Please try again later."
          />
        ) : (
          <UserTable
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
          />
        )}
      </div>
    </div>
  );
}
