// A priced component of a plan change. Line items always sum EXACTLY to the
// amount due, which is what makes a quote explainable to a customer and
// auditable years later.
//
// Credit and discount kinds carry negative amounts; charge kinds carry positive.
export enum ProrationLineItemType {
  // A complete billing period of the target plan (RESET_CYCLE_WITH_UNUSED_CREDIT).
  TARGET_PLAN_FULL_PERIOD = 'TARGET_PLAN_FULL_PERIOD',
  // The target plan for the remainder of the existing period
  // (KEEP_CYCLE_PRORATE_DIFFERENCE).
  TARGET_PLAN_REMAINING_PERIOD = 'TARGET_PLAN_REMAINING_PERIOD',
  // Unused value of the plan being left. Negative.
  UNUSED_PLAN_CREDIT = 'UNUSED_PLAN_CREDIT',
  // Previously banked, non-withdrawable billing credit applied here. Negative.
  BILLING_CREDIT_APPLIED = 'BILLING_CREDIT_APPLIED',
}
