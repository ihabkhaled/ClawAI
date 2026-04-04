import type { AuditAction, AuditSeverity } from "@/enums";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  severity: AuditSeverity;
  userId: string;
  userName: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditListParams {
  page?: number;
  limit?: number;
  action?: AuditAction;
  severity?: AuditSeverity;
}
