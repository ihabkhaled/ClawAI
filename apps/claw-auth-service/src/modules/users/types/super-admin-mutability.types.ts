import { type SuperAdminMutationScope } from '../../../common/enums/super-admin-mutation-scope.enum';

/** The only two facts about a target row the mutability rule needs. */
export interface SuperAdminMutabilityTarget {
  id: string;
  isSuperAdmin: boolean;
}

/** Why a mutation was refused, or that it was allowed. */
export type SuperAdminMutabilityOutcome =
  | { allowed: true }
  | { allowed: false; reason: 'IMMUTABLE_TO_OTHERS' }
  | { allowed: false; reason: 'LOCKED_FOR_SELF' };

export interface SuperAdminMutabilityInput {
  target: SuperAdminMutabilityTarget;
  actorId: string;
  scope: SuperAdminMutationScope;
}
