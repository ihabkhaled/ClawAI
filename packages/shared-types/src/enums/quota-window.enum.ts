// Windows a weighted-token reservation is checked against. Every window is
// evaluated in ONE atomic Redis operation — never as independent check-then-act
// commands, which let concurrent requests both pass the last slot.
//
// Period keys are UTC: DAY=YYYY-MM-DD, WEEK=ISO week, MONTH=YYYY-MM,
// BILLING_PERIOD=the subscription's current period id.
export enum QuotaWindow {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  BILLING_PERIOD = 'BILLING_PERIOD',
}
