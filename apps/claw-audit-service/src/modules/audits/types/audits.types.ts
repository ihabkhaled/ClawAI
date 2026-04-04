export interface CreateAuditLogInput {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  severity?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  severity?: string;
}

export interface CreateUsageLedgerInput {
  userId: string;
  resourceType: string;
  action: string;
  quantity: number;
  unit?: string;
  metadata?: Record<string, unknown>;
}

export interface UsageLedgerFilters {
  userId?: string;
  resourceType?: string;
  action?: string;
}
