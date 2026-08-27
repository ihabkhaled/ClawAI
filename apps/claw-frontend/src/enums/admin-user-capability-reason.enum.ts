/**
 * Why an administrative control on a user row is unavailable.
 *
 * Two reasons, not one, because they need different copy: "this row is
 * protected from you" and "this row is you, and this particular change is
 * locked" are different sentences, and the second is what stops the super
 * administrator filing a bug about their own account.
 */
export enum AdminUserCapabilityReason {
  /** The target is the super administrator and the actor is somebody else. */
  SuperAdminOther = 'SUPER_ADMIN_OTHER',
  /** The actor is the super administrator, acting on their own row. */
  SuperAdminSelf = 'SUPER_ADMIN_SELF',
}
