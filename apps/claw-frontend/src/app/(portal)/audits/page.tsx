"use client";

import { Shield } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AuditsPage() {
  const hasAudits = false;

  return (
    <div>
      <PageHeader
        title="Audits"
        description="Review activity logs and security audit trails"
      />

      {hasAudits ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody />
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={Shield}
          title="No audit entries"
          description="Audit logs will appear here as users perform actions within the platform. All critical operations are tracked automatically."
        />
      )}
    </div>
  );
}
