// Bounded like every other id that reaches a database lookup. A cuid is 25
// characters; 64 leaves room without letting an unbounded string through.
export const ADMIN_USER_ID_MAX_LENGTH = 64;

// The admin modal shows a recent-invoice table, not the account's archive.
// Two years of monthly invoices is already more than anyone scrolls, and an
// unbounded list is a free way to make one admin request expensive.
export const ADMIN_USER_RECENT_INVOICE_LIMIT = 24;

// The bound on the PAID-invoice scan behind monthsPaid / totalPaidMinor lives
// with the repository that applies it: PAID_INVOICE_SCAN_LIMIT in
// modules/subscriptions/constants/subscriptions.constants.ts.

// Fallback period length, in calendar months, when an interval is not one of
// the four known ones. Matches the documented fallback on
// MONTHS_BY_BILLING_INTERVAL rather than inventing a second convention.
export const ADMIN_USER_DEFAULT_PERIOD_MONTHS = 1;

// A paid period shorter than a calendar month still counts as one month paid.
// See resolveInvoicePeriodMonths for why zero is the wrong answer.
export const ADMIN_USER_MINIMUM_INVOICE_MONTHS = 1;

export const CALENDAR_MONTHS_PER_YEAR = 12;
