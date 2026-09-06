import { SubscriptionStatus } from '@claw/shared-types';

// A customer's billing history is bounded rather than unbounded. Nobody reads
// their 400th invoice in a dropdown, and an unbounded list is a free way to
// make one request expensive.
export const INVOICE_LIST_LIMIT = 100;

// Bound on the PAID-invoice scan the admin billing totals are summed over.
// Higher than INVOICE_LIST_LIMIT because these figures are totals rather than
// a table: truncating them would understate what a customer has paid. 600
// monthly invoices is fifty years of billing, so a real account cannot reach
// it and a runaway one cannot make the query unbounded.
export const PAID_INVOICE_SCAN_LIMIT = 600;

// Statuses a subscription may be cancelled from. Cancelling one that is already
// cancelled, expired or charged back is refused rather than silently accepted —
// the caller needs to know nothing happened.
export const CANCELLABLE_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
];

// Statuses a plan change may start from. A PAST_DUE subscriber is deliberately
// excluded: taking an upgrade payment from someone whose last payment failed
// stacks a second obligation on an unresolved one.
export const CHANGEABLE_STATUSES: SubscriptionStatus[] = [SubscriptionStatus.ACTIVE];
