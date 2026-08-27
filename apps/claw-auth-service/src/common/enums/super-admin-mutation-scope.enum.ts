/**
 * What a mutation is trying to change about a user row.
 *
 * The super administrator is immutable to every other administrator, but not to
 * themselves — and "not to themselves" is scope-dependent, not absolute. Editing
 * your own display name is ordinary; deactivating or deleting the only account
 * that can ever hold `isSuperAdmin` is unrecoverable without DB surgery, because
 * the partial unique index `users_single_super_admin_idx` guarantees at most one
 * and nothing re-creates it except a fresh seed against an empty admin table.
 *
 * Each scope therefore answers one question: may the super administrator do this
 * to their own row?
 */
export enum SuperAdminMutationScope {
  /** Display fields — username, first name, last name. Self-permitted. */
  PROFILE = 'PROFILE',
  /** Role assignment. Never permitted on the super administrator, self included. */
  ROLE = 'ROLE',
  /** Status transitions — deactivate, reactivate, activate. Never self-permitted. */
  STATUS = 'STATUS',
  /** Account deletion. Never self-permitted. */
  DELETE = 'DELETE',
  /** Plan assignment. Never permitted; the super administrator bypasses plans. */
  PLAN = 'PLAN',
  /**
   * Administrator-issued password rotation. Never self-permitted — the super
   * administrator changes their own password through the authenticated
   * `/users/me/password` route, which proves knowledge of the current one.
   */
  TEMPORARY_PASSWORD = 'TEMPORARY_PASSWORD',
}
