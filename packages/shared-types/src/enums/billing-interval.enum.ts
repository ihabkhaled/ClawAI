// Recurring billing cadence. Yearly is priced at ~10 months of the monthly rate
// (two months free) and is stored as its own PlanPriceVersion row, never derived.
export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}
