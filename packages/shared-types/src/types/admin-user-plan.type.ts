/**
 * The auth-owned half of a user's subscription picture, for the admin users
 * page.
 *
 * Deliberately separate from the payment-owned half
 * (`AdminUserSubscriptionOverview`): plans, entitlement grants and free trials
 * live in auth-service, while subscriptions, invoices and money live in
 * payment-service, and neither service may read the other's tables. The admin
 * modal fetches both and renders them together rather than one service
 * proxying the other's data and becoming a second source of truth for it.
 */

/** The plan an assignment points at. */
export type AdminUserPlanSummary = {
  id: string;
  slug: string;
  name: string;
  isTrial: boolean;
  /** Configured trial length. `null` on a plan that is not a trial. */
  trialDurationDays: number | null;
};

/**
 * The entitlement grant currently in force, with its provenance.
 *
 * Reported even when expired: "why did this user lose access" is answered by an
 * expired grant, and hiding it would answer the question with a blank panel.
 * Compare `entitlementValidUntil` against now to tell the two apart.
 */
export type AdminUserPlanAssignment = {
  status: string;
  /** How the plan was granted: PAID_SUBSCRIPTION, ADMIN_GRANT, PROMOTIONAL, MIGRATION, FREE_DEFAULT. */
  grantType: string;
  /** Free-text justification captured on an admin grant. `null` for system grants. */
  grantReason: string | null;
  startsAt: string;
  endsAt: string | null;
  /** When paid entitlement lapses. `null` means it never expires. ISO-8601. */
  entitlementValidUntil: string | null;
  /** The payment-service subscription this grant came from, when it came from one. */
  sourceSubscriptionId: string | null;
};

/**
 * The user's one lifetime free trial.
 *
 * From `PlanTrialRedemption`, which is written once per user and survives the
 * assignment being replaced by a paid plan — so this still reports the trial
 * after it ended, which is the history an operator is reconstructing.
 */
export type AdminUserTrial = {
  startedAt: string;
  expiresAt: string;
  /**
   * Whole days until `expiresAt`, rounded UP, floored at 0.
   *
   * Rounded up because any remaining time is a day the user still has: a trial
   * with thirty minutes left is "1 day remaining", not "0", and reporting 0
   * would read as expired while the account still works. Reads 0 only once
   * `expiresAt` has actually passed — at which point `isExpired` is true.
   */
  daysRemaining: number;
  isExpired: boolean;
};

/** Everything the auth service contributes to the admin subscription modal. */
export type AdminUserPlanOverview = {
  userId: string;
  /** When the server computed this, ISO-8601. `daysRemaining` is relative to it. */
  generatedAt: string;
  plan: AdminUserPlanSummary | null;
  assignment: AdminUserPlanAssignment | null;
  /** `null` when the user has never redeemed a trial. */
  trial: AdminUserTrial | null;
};
