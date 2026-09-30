// Recurring billing cadence. QUARTERLY, SEMIANNUAL and YEARLY are priced from
// the monthly rate less a per-plan discount (10% / 15% / 20% by default, ADR-135).
// Every interval is stored as its own PlanPriceVersion row, minted when the
// monthly price or a discount changes — never derived at request time.
export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMIANNUAL = 'SEMIANNUAL',
  YEARLY = 'YEARLY',
}
