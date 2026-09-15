// The token windows the backend enforces. Mirrors QuotaWindow in
// @claw/shared-types — the frontend does not import server packages, so the
// values are duplicated here and must stay identical.
export enum QuotaWindowKind {
  Day = 'DAY',
  Week = 'WEEK',
  Month = 'MONTH',
  BillingPeriod = 'BILLING_PERIOD',
}
