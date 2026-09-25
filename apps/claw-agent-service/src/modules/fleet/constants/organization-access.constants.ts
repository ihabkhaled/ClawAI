import { OrganizationRole } from '../../../generated/prisma';

/**
 * Roles that may administer an organization: change its members, its policy,
 * its SSO metadata, and read its device matrix.
 */
export const ORGANIZATION_ADMINISTRATOR_ROLES: readonly OrganizationRole[] = [
  OrganizationRole.OWNER,
  OrganizationRole.ADMIN,
];

/**
 * Roles only an OWNER may grant. An ADMIN minting an OWNER would be an
 * escalation past their own rank, because an OWNER outranks them.
 */
export const OWNER_ONLY_GRANTABLE_ROLES: readonly OrganizationRole[] = [OrganizationRole.OWNER];

/**
 * The single message every "you cannot see this organization" path returns.
 * A stranger, a missing id and an unknown slug must be indistinguishable
 * (rules/16 §6), so none of them may echo the id or slug back.
 */
export const ORGANIZATION_NOT_FOUND_MESSAGE = 'Organization not found';
