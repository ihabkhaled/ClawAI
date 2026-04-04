import { type AuditAction, type AuditSeverity } from "../../../common/enums";

export interface CreateAuditLogInput {
  userId: string | null;
  action: AuditAction;
  entityType: string | null;
  entityId: string | null;
  severity: AuditSeverity;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
}
