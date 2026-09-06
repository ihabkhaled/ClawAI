import type { BillingInterval } from '../enums/billing-interval.enum';
import type { InvoiceStatus } from '../enums/invoice-status.enum';
import type { SubscriptionStatus } from '../enums/subscription-status.enum';

/**
 * A single user's subscription and billing history as the ADMIN users page
 * reads it.
 *
 * Distinct from `BillingOverview`, which a user reads about themselves: that
 * one answers "what am I entitled to right now", so it carries the plan name
 * and grace-period flags a billing page renders. This one answers "what has
 * this account bought and paid for", so it carries the full subscription
 * history and the money actually collected instead.
 *
 * Every gateway identifier is absent by construction — those are encrypted at
 * rest and never leave the payment service, admin permission or not.
 */

/**
 * The user's one effective subscription, or absent entirely for a free user.
 *
 * "Effective" is the database-level guarantee (`uniqueActiveKey`), not merely
 * the newest row: a user with three cancelled subscriptions has no current
 * subscription, and reporting the newest of them as current would show an
 * operator a plan the account is not on.
 */
export type AdminUserSubscriptionSnapshot = {
  id: string;
  planId: string;
  planSlug: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currency: string;
  /** Integer minor units ($5.00 -> 500). Never a float, never a formatted string. */
  amountMinor: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  pastDueAt: string | null;
  gracePeriodEndsAt: string | null;
  entitlementValidUntil: string;
  /** Populated when a downgrade is queued for the end of the current period. */
  scheduledPlanSlug: string | null;
  scheduledEffectiveAt: string | null;
  createdAt: string;
};

/**
 * One row of the account's subscription history, newest first.
 *
 * Cancelled, expired, refunded and charged-back rows are all included. Billing
 * history is append-only, and hiding the terminal rows would leave an operator
 * unable to see the sequence that produced today's state.
 */
export type AdminUserSubscriptionHistoryEntry = {
  id: string;
  planSlug: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  /** Integer minor units. */
  amountMinor: number;
  currency: string;
  createdAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
};

/** One recent invoice. Integer minor units throughout. */
export type AdminUserInvoiceEntry = {
  id: string;
  /** Human-facing reference, e.g. `CLAW-00000003`. */
  number: string;
  status: InvoiceStatus;
  currency: string;
  totalMinor: number;
  amountPaidMinor: number;
  periodStart: string | null;
  periodEnd: string | null;
  issuedAt: string;
  paidAt: string | null;
};

/**
 * Money collected in ONE currency.
 *
 * Deliberately a list rather than a single total. Adding 500 USD to 10000 EGP
 * produces a number that means nothing, and a rate applied at read time would
 * silently restate history every time the rate moved.
 */
export type AdminUserPaidTotal = {
  currency: string;
  /** Integer minor units, summed only within this currency. */
  amountMinor: number;
};

/** Everything the admin "subscription and billing" modal renders for one user. */
export type AdminUserSubscriptionStatistics = {
  userId: string;
  /** When the server computed this, ISO-8601. */
  generatedAt: string;
  /** null for a free account — a valid answer, not an error. */
  subscription: AdminUserSubscriptionSnapshot | null;
  /**
   * Calendar months the current subscription's billing interval spans
   * (MONTHLY 1, QUARTERLY 3, SEMIANNUAL 6, YEARLY 12). null when there is no
   * current subscription.
   */
  periodLengthMonths: number | null;
  /**
   * When the account will next be charged, or null when it will NOT be.
   *
   * null whenever `cancelAtPeriodEnd` is set or the status carries no
   * entitlement. `currentPeriodEnd` still has a value on a cancelled
   * subscription — it is when access stops, not when money moves — so
   * publishing it as a renewal date would tell an operator a churned customer
   * is about to pay again.
   */
  nextRenewalAt: string | null;
  /**
   * Billing months the user has ACTUALLY paid for, summed over PAID invoices.
   *
   * Derived, never stored: there is no counter to trust. Each PAID invoice
   * contributes the length of the period it covers, so one yearly invoice
   * counts as 12 and twelve monthly invoices also count as 12.
   */
  monthsPaid: number;
  /** Money collected, per currency. Never summed across currencies. */
  totalPaidMinor: AdminUserPaidTotal[];
  /** Every subscription the account has ever had, newest first. */
  subscriptionHistory: AdminUserSubscriptionHistoryEntry[];
  /** Newest first, capped server-side. Not the account's full invoice archive. */
  recentInvoices: AdminUserInvoiceEntry[];
};
