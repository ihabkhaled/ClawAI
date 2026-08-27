import { SuperAdminMutationScope } from '../enums/super-admin-mutation-scope.enum';

/**
 * Machine-readable refusal codes for the super-administrator invariant.
 *
 * These are the contract the frontend translates against. They were inline
 * string literals in `users.service.ts`, which put a user-visible contract in a
 * logic file and left the frontend with nothing stable to map to — so a 403
 * reached the user as the backend's raw English.
 */
export const SUPER_ADMIN_IMMUTABLE_CODE = 'SUPER_ADMIN_IMMUTABLE';
export const SUPER_ADMIN_SELF_LOCKED_CODE = 'SUPER_ADMIN_SELF_LOCKED';
export const SUPER_ADMIN_REQUIRED_CODE = 'SUPER_ADMIN_REQUIRED';

export const SUPER_ADMIN_IMMUTABLE_MESSAGE =
  'Only the super administrator may modify the super administrator';
export const SUPER_ADMIN_SELF_LOCKED_MESSAGE =
  'The super administrator cannot make this change to their own account';
export const SUPER_ADMIN_REQUIRED_MESSAGE = 'Only the super administrator may perform this action';

/** Structured-log action names, so a refusal is greppable as a security signal. */
export const SUPER_ADMIN_REFUSED_TARGET_ACTION = 'super_admin_target_refused';
export const SUPER_ADMIN_REFUSED_SELF_ACTION = 'super_admin_self_refused';
export const SUPER_ADMIN_REFUSED_ACTOR_ACTION = 'super_admin_actor_refused';

/**
 * The scopes the super administrator may apply to their own row.
 *
 * Everything absent from this set is refused even when the actor is the super
 * administrator themselves. See {@link SuperAdminMutationScope} for why.
 */
export const SUPER_ADMIN_SELF_PERMITTED_SCOPES: ReadonlySet<SuperAdminMutationScope> = new Set([
  SuperAdminMutationScope.PROFILE,
]);
