import type { MemoryAuditAction } from '../../../generated/prisma';

export type WriteAuditLogData = {
  userId: string;
  memoryId?: string | null;
  action: MemoryAuditAction;
  actor: string;
  details?: Record<string, unknown> | null;
};
