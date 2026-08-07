// How an immediate plan change is priced.
//
// These are two defensible policies, not a right and a wrong one, so the mode is
// stored on the quote and on the plan's policy revision rather than being an
// implicit property of whichever calculator happened to be deployed.
export enum ProrationMode {
  // The billing cycle is preserved. The customer pays the difference between the
  // two plans for the time REMAINING in the period they already bought:
  //
  //   due = (target x remainingRatio) - (current x remainingRatio)
  //
  // $5 -> $10 at day 10 of 30 charges 334 minor units and the renewal date does
  // not move. This is the behaviour ClawAI shipped before v2.
  KEEP_CYCLE_PRORATE_DIFFERENCE = 'KEEP_CYCLE_PRORATE_DIFFERENCE',

  // The billing cycle RESETS. The unused value of the current plan becomes a
  // credit against a full new period of the target plan:
  //
  //   due = targetFullPeriod - (current x remainingRatio)
  //
  // $5 -> $10 at day 10 of 30 charges 667 minor units and a fresh 30-day period
  // begins once payment succeeds.
  RESET_CYCLE_WITH_UNUSED_CREDIT = 'RESET_CYCLE_WITH_UNUSED_CREDIT',
}
