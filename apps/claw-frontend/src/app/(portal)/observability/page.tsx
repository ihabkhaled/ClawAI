"use client";

import { Activity } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ObservabilityPage() {
  return (
    <div>
      <PageHeader
        title="Observability"
        description="Monitor system health, request latencies, and model performance"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-2xl">
              <Skeleton className="h-8 w-20" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Awaiting data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Latency</CardDescription>
            <CardTitle className="text-2xl">
              <Skeleton className="h-8 w-20" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Awaiting data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Error Rate</CardDescription>
            <CardTitle className="text-2xl">
              <Skeleton className="h-8 w-20" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Awaiting data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Models</CardDescription>
            <CardTitle className="text-2xl">
              <Skeleton className="h-8 w-20" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Awaiting data</p>
          </CardContent>
        </Card>
      </div>

      <EmptyState
        icon={Activity}
        title="No observability data yet"
        description="Metrics and performance data will populate here once requests begin flowing through the orchestration layer."
      />
    </div>
  );
}
