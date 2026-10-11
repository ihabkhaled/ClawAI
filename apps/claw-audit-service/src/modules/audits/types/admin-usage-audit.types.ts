/** What auth-service publishes when an admin reads user consumption. Ids and filters only. */
export type AdminUsageAuditPayload = {
  actorUserId: string;
  targetUserId: string | null;
  at: string;
  filters: Record<string, string | number | null>;
};
