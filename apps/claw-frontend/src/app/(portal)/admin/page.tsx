"use client";

import { ShieldCheck, Users } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Admin"
        description="Platform administration and user management"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">User Management</CardTitle>
            </div>
            <CardDescription>
              Manage platform users, roles, and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Users
                </span>
                <Skeleton className="h-5 w-10" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Active Users
                </span>
                <Skeleton className="h-5 w-10" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Pending Invites
                </span>
                <Skeleton className="h-5 w-10" />
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
              System status and configuration overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Active Connectors
                </span>
                <Skeleton className="h-5 w-10" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Available Models
                </span>
                <Skeleton className="h-5 w-10" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  System Uptime
                </span>
                <Skeleton className="h-5 w-10" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
