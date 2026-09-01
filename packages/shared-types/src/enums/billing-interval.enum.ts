// Recurring billing cadence. QUARTERLY and SEMIANNUAL carry a 10% discount off
// the monthly rate; YEARLY is priced at ~10 months of the monthly rate (two
// months free). Every interval is stored as its own PlanPriceVersion row,
// never derived at request time.
export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMIANNUAL = 'SEMIANNUAL',
  YEARLY = 'YEARLY',
}
