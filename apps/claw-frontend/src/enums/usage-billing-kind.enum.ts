/** Who paid for a request. Mirrors auth-service UsageBillingKind. */
export enum UsageBillingKind {
  Credit = 'CREDIT',
  Allowance = 'ALLOWANCE',
  Unmetered = 'UNMETERED',
  Plan = 'PLAN',
}
