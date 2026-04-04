"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DASHBOARD_STAT_CARDS,
  DASHBOARD_QUICK_ACTIONS,
} from "@/constants/dashboard.constants";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here is an overview of your Claw platform."
        actions={
          <div className="flex items-center gap-2 text-muted-foreground">
            <LayoutDashboard className="h-5 w-5" />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {DASHBOARD_STAT_CARDS.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Quick Actions
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {DASHBOARD_QUICK_ACTIONS.map((action) => (
            <Card key={action.label} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <action.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{action.label}</CardTitle>
                </div>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          System Health
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Status</CardTitle>
            <CardDescription>
              Health aggregator integration coming soon. All services will be
              monitored here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect to the health aggregator service to view real-time status
              of all microservices.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
