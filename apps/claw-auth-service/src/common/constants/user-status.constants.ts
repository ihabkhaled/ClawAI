/**
 * Refusal code for an activation aimed at an account that is not waiting on the
 * email wall.
 *
 * Activating is not the same as reactivating: a `SUSPENDED` account has already
 * verified its address and needs the suspension lifted, not a verification
 * timestamp written. Refusing here rather than silently doing the right-looking
 * thing keeps the two administrator actions distinguishable in the audit trail.
 */
export const USER_NOT_PENDING_CODE = 'USER_NOT_PENDING';
