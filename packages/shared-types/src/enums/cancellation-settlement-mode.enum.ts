// What a subscriber is owed when they terminate immediately.
//
// This is deliberately separate from the cooling-off window itself. Cooling-off
// answers "may they have all their money back"; settlement answers "what happens
// once that window has closed". Collapsing the two would let someone consume
// most of a billing period and still claim an unconditional full refund.
//
// The mode lives on the plan's policy revision and is audited. It is never
// decided in frontend code.
export enum CancellationSettlementMode {
  // Recommended default. Full eligible refund inside the cooling-off window;
  // afterwards, the unused prorated remainder of the current period.
  FULL_WITHIN_COOLING_OFF_THEN_UNUSED_PRORATED = 'FULL_WITHIN_COOLING_OFF_THEN_UNUSED_PRORATED',

  // Full refund inside the window, nothing afterwards. Access still ends at the
  // effective cancellation time.
  FULL_WITHIN_COOLING_OFF_THEN_NO_REFUND = 'FULL_WITHIN_COOLING_OFF_THEN_NO_REFUND',

  // Always a full refund of the remaining refundable balance, whenever the
  // cancellation happens. Only for explicitly approved exceptional products —
  // it lets a subscriber use a whole period for free.
  FULL_ALWAYS = 'FULL_ALWAYS',

  // Full cash refund inside the window; afterwards the unused value is issued as
  // non-withdrawable billing credit rather than returned to the payment method.
  // Requires product and legal approval in the jurisdictions it is offered in.
  CREDIT_ONLY_AFTER_COOLING_OFF = 'CREDIT_ONLY_AFTER_COOLING_OFF',
}
