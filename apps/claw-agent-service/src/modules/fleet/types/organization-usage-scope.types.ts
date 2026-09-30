/**
 * Who an organization's usage aggregate may cover. Returned to auth-service,
 * which owns the usage ledger but not the organization tables.
 */
export type OrganizationUsageScope = {
  organizationId: string;
  memberUserIds: string[];
};
