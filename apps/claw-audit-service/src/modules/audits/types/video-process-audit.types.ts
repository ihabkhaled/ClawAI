export interface VideoProcessAuditRow {
  userId: string;
  action: string;
  entityId: string;
  severity: 'LOW' | 'ERROR';
  details: Record<string, unknown>;
}
