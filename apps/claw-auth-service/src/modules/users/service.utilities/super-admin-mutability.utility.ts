import { SUPER_ADMIN_SELF_PERMITTED_SCOPES } from '../../../common/constants/super-admin.constants';
import {
  type SuperAdminMutabilityInput,
  type SuperAdminMutabilityOutcome,
} from '../types/super-admin-mutability.types';

/**
 * Decides whether one actor may apply one scope of change to one target row.
 *
 * Pure by design. Target protection and actor authority are two halves of the
 * same invariant and a naive `actorId === target.id` exemption bolted onto an
 * ungated actor path is an escalation, not a relaxation — so the self-exemption
 * lives here, in one testable place, rather than being re-derived at each call
 * site.
 *
 * This function answers the TARGET question only: is this row shielded from this
 * actor? Whether the actor holds enough authority to perform an administrator-
 * class mutation at all is a separate question, answered by a database read
 * (`UsersService.assertSuperAdminActor`) because the access token carries no
 * super-admin claim.
 */
export function resolveSuperAdminMutability(
  input: SuperAdminMutabilityInput,
): SuperAdminMutabilityOutcome {
  if (!input.target.isSuperAdmin) {
    return { allowed: true };
  }

  if (input.actorId !== input.target.id) {
    return { allowed: false, reason: 'IMMUTABLE_TO_OTHERS' };
  }

  if (!SUPER_ADMIN_SELF_PERMITTED_SCOPES.has(input.scope)) {
    return { allowed: false, reason: 'LOCKED_FOR_SELF' };
  }

  return { allowed: true };
}
