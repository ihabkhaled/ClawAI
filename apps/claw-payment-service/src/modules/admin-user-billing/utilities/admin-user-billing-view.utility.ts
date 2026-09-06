import { sumMinor } from '@claw/shared-utilities';

import { ENTITLEMENT_BEARING_STATUSES } from '../../../common/constants/subscription-transitions.constants';
import { MONTHS_BY_BILLING_INTERVAL } from '../../webhooks/constants/billing-period.constants';
import {
  ADMIN_USER_DEFAULT_PERIOD_MONTHS,
  ADMIN_USER_MINIMUM_INVOICE_MONTHS,
  CALENDAR_MONTHS_PER_YEAR,
} from '../constants/admin-user-billing.constants';
import {
  type AdminInvoiceEntryDraft,
  type AdminPaidTotalDraft,
  type AdminSubscriptionHistoryDraft,
  type AdminSubscriptionSnapshotDraft,
  type AdminUserBillingSources,
  type AdminUserSubscriptionStatisticsDraft,
} from '../types/admin-user-billing.types';
import { type Invoice, type Subscription } from '../../../generated/prisma';

/**
 * Calendar months a billing interval spans.
 *
 * `billingInterval` is a plain `String` column, so the lookup is by search
 * rather than by index: an unrecognised value must fall back to one month, not
 * produce `undefined` months and poison every sum downstream.
 */
export function resolvePeriodLengthMonths(billingInterval: string): number {
  const entry = Object.entries(MONTHS_BY_BILLING_INTERVAL).find(
    ([interval]) => interval === billingInterval,
  );
  if (entry === undefined) {
    return ADMIN_USER_DEFAULT_PERIOD_MONTHS;
  }
  const [, months] = entry;
  return months;
}

/**
 * When the account will next be charged, or null when it will NOT be.
 *
 * `currentPeriodEnd` is populated on a cancelled or expired subscription too —
 * there it means "when access stops", not "when money moves". Publishing it as
 * a renewal date would tell an operator a churned customer is about to pay
 * again, so it is withheld unless the subscription is both entitlement-bearing
 * and not already set to stop at period end.
 */
export function resolveNextRenewalAt(subscription: Subscription): string | null {
  if (subscription.cancelAtPeriodEnd) {
    return null;
  }
  const entitlementBearing: readonly string[] = ENTITLEMENT_BEARING_STATUSES;
  if (!entitlementBearing.includes(subscription.status)) {
    return null;
  }
  return subscription.currentPeriodEnd.toISOString();
}

/**
 * Whole calendar months from `start` to `end`, in UTC.
 *
 * A calendar-month difference rather than a day count, because
 * `addCalendarMonths` — the function that WROTE these period ends — clamps
 * 31 January + 1 month to 28 February. Counting days would score that period
 * as 28/31 of a month and lose it to truncation.
 */
export function calendarMonthsBetween(start: Date, end: Date): number {
  const years = end.getUTCFullYear() - start.getUTCFullYear();
  return years * CALENDAR_MONTHS_PER_YEAR + (end.getUTCMonth() - start.getUTCMonth());
}

/**
 * Billing months one PAID invoice represents.
 *
 * Preference order:
 *  1. The invoice's own `periodStart`/`periodEnd` — the period the customer
 *     actually bought, which stays correct after a later plan or interval
 *     change because the document is immutable.
 *  2. `fallbackMonths`, the interval of the subscription the invoice was
 *     issued against, for a document that carries no period at all.
 *
 * A period shorter than one calendar month (a proration, a mid-cycle
 * correction) counts as 1, never 0: the customer did pay for a period, and
 * rounding it away would report a paying account as having paid for nothing.
 */
export function resolveInvoicePeriodMonths(invoice: Invoice, fallbackMonths: number): number {
  if (invoice.periodStart === null || invoice.periodEnd === null) {
    return fallbackMonths;
  }
  const months = calendarMonthsBetween(invoice.periodStart, invoice.periodEnd);
  return Math.max(months, ADMIN_USER_MINIMUM_INVOICE_MONTHS);
}

/**
 * Period length in months for each subscription the account has had.
 *
 * Keyed by subscription id so a periodless invoice falls back to the interval
 * of the subscription it was actually issued against, not to whatever the user
 * happens to be on today.
 */
export function periodMonthsBySubscriptionId(history: Subscription[]): Map<string, number> {
  return new Map(
    history.map((subscription) => [
      subscription.id,
      resolvePeriodLengthMonths(subscription.billingInterval),
    ]),
  );
}

/**
 * Billing months actually paid for, summed over PAID invoices.
 *
 * Derived, never stored — no counter exists, and one would drift the first
 * time an invoice was voided. Only PAID invoices reach here: a fully refunded
 * invoice moves to REFUNDED and correctly stops counting, while an OPEN one
 * has not been paid at all.
 */
export function sumMonthsPaid(
  paidInvoices: Invoice[],
  monthsBySubscriptionId: ReadonlyMap<string, number>,
): number {
  return paidInvoices.reduce((total, invoice) => {
    const fallback =
      invoice.subscriptionId === null
        ? ADMIN_USER_DEFAULT_PERIOD_MONTHS
        : (monthsBySubscriptionId.get(invoice.subscriptionId) ?? ADMIN_USER_DEFAULT_PERIOD_MONTHS);
    return total + resolveInvoicePeriodMonths(invoice, fallback);
  }, 0);
}

/**
 * Money collected, one integer total per currency.
 *
 * Currencies are never folded together: 500 USD plus 10000 EGP is a number
 * that means nothing, and converting at read time would restate history every
 * time the rate moved (rule 28.4).
 */
export function sumPaidTotalsByCurrency(paidInvoices: Invoice[]): AdminPaidTotalDraft[] {
  const currencies = [...new Set(paidInvoices.map((invoice) => invoice.currency))].sort();
  return currencies.map((currency) => ({
    currency,
    amountMinor: sumMinor(
      paidInvoices
        .filter((invoice) => invoice.currency === currency)
        .map((invoice) => invoice.amountPaidMinor),
    ),
  }));
}

/**
 * Projects the current subscription.
 *
 * Explicit field list, never a spread — exactly as `toCurrentSubscriptionView`
 * does. A spread here would publish `encryptedGatewaySubscriptionId`,
 * `gatewaySubscriptionLookupHash` and the optimistic-concurrency `version`,
 * and would keep publishing every column added to the model in future.
 */
export function toAdminSubscriptionSnapshot(
  subscription: Subscription,
): AdminSubscriptionSnapshotDraft {
  return {
    id: subscription.id,
    planId: subscription.planId,
    planSlug: subscription.planSlug,
    status: subscription.status,
    billingInterval: subscription.billingInterval,
    currency: subscription.currency,
    amountMinor: subscription.amountMinor,
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
    pastDueAt: subscription.pastDueAt?.toISOString() ?? null,
    gracePeriodEndsAt: subscription.gracePeriodEndsAt?.toISOString() ?? null,
    entitlementValidUntil: subscription.entitlementValidUntil.toISOString(),
    scheduledPlanSlug: subscription.scheduledPlanSlug,
    scheduledEffectiveAt: subscription.scheduledEffectiveAt?.toISOString() ?? null,
    createdAt: subscription.createdAt.toISOString(),
  };
}

/** One history row. Explicit field list, for the same reason as above. */
export function toAdminSubscriptionHistoryEntry(
  subscription: Subscription,
): AdminSubscriptionHistoryDraft {
  return {
    id: subscription.id,
    planSlug: subscription.planSlug,
    status: subscription.status,
    billingInterval: subscription.billingInterval,
    amountMinor: subscription.amountMinor,
    currency: subscription.currency,
    createdAt: subscription.createdAt.toISOString(),
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
  };
}

/** One invoice row. Explicit field list, for the same reason as above. */
export function toAdminInvoiceEntry(invoice: Invoice): AdminInvoiceEntryDraft {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    totalMinor: invoice.totalMinor,
    amountPaidMinor: invoice.amountPaidMinor,
    periodStart: invoice.periodStart?.toISOString() ?? null,
    periodEnd: invoice.periodEnd?.toISOString() ?? null,
    issuedAt: invoice.issuedAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString() ?? null,
  };
}

/** Assembles the whole draft. Validated into the shared contract by the caller. */
export function toAdminUserSubscriptionStatisticsDraft(
  sources: AdminUserBillingSources,
): AdminUserSubscriptionStatisticsDraft {
  const monthsBySubscriptionId = periodMonthsBySubscriptionId(sources.history);
  return {
    userId: sources.userId,
    generatedAt: sources.generatedAt.toISOString(),
    subscription: sources.current === null ? null : toAdminSubscriptionSnapshot(sources.current),
    periodLengthMonths:
      sources.current === null ? null : resolvePeriodLengthMonths(sources.current.billingInterval),
    nextRenewalAt: sources.current === null ? null : resolveNextRenewalAt(sources.current),
    monthsPaid: sumMonthsPaid(sources.paidInvoices, monthsBySubscriptionId),
    totalPaidMinor: sumPaidTotalsByCurrency(sources.paidInvoices),
    subscriptionHistory: sources.history.map((entry) => toAdminSubscriptionHistoryEntry(entry)),
    recentInvoices: sources.recentInvoices.map((invoice) => toAdminInvoiceEntry(invoice)),
  };
}
