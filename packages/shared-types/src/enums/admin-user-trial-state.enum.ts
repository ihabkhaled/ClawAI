// Where a user's one lifetime free trial stands RIGHT NOW, as opposed to when
// it was written.
//
// `PlanTrialRedemption` is written once per user and deliberately survives the
// assignment being replaced, so its `expiresAt` alone cannot answer "is this
// user on a trial". Reading it as if it could is what made an admin-granted Pro
// account report "Free trial — 23 days left" beside a grant valid for a year:
// the countdown was real, it just belonged to a trial that had already been
// superseded a week earlier.
//
// SUPERSEDED is therefore its own state and not a flavour of EXPIRED. The trial
// did not run out — something better replaced it — and an operator deciding
// whether a user is about to lose access needs those two told apart.
export enum AdminUserTrialState {
  /** The trial IS the entitlement currently in force, and is still counting down. */
  ACTIVE = 'ACTIVE',
  /** The trial ran its full course and nothing replaced it. */
  EXPIRED = 'EXPIRED',
  /** A later grant or subscription replaced the trial, whether or not it had run out. */
  SUPERSEDED = 'SUPERSEDED',
}
