// Why a model request was refused. Split by reason on purpose: the three cases
// mean different things operationally. A plan denial is a sales question, an
// exposure denial is an inventory question, and an unreachable-connector denial
// is an outage. Collapsing them into one "denied" counter hides which one is
// happening.
export enum ModelAuthorizationDenialReason {
  PLAN = 'PLAN',
  EXPOSURE = 'EXPOSURE',
  EXECUTION_EXPOSURE = 'EXECUTION_EXPOSURE',
}
