import { type Invoice, type Subscription } from '../../../generated/prisma';

/**
 * Draft shapes: what the view utility builds BEFORE the response schema
 * validates it.
 *
 * `status` and `billingInterval` are plain `String` columns in this service's
 * schema, not Prisma enums, so a row can physically hold a value outside
 * `SubscriptionStatus` / `InvoiceStatus`. The drafts therefore carry `string`,
 * and the Zod response schema is what turns them into the enum-typed
 * `AdminUserSubscriptionStatistics` the shared contract promises. That is a
 * runtime check, not a cast: an unrecognised status fails loudly here instead
 * of reaching an admin screen typed as something it is not.
 */
export type AdminSubscriptionSnapshotDraft = {
  id: string;
  planId: string;
  planSlug: string;
  status: string;
  billingInterval: string;
  currency: string;
  amountMinor: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  pastDueAt: string | null;
  gracePeriodEndsAt: string | null;
  entitlementValidUntil: string;
  scheduledPlanSlug: string | null;
  scheduledEffectiveAt: string | null;
  createdAt: string;
};

export type AdminSubscriptionHistoryDraft = {
  id: string;
  planSlug: string;
  status: string;
  billingInterval: string;
  amountMinor: number;
  currency: string;
  createdAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
};

export type AdminInvoiceEntryDraft = {
  id: string;
  number: string;
  status: string;
  currency: string;
  totalMinor: number;
  amountPaidMinor: number;
  periodStart: string | null;
  periodEnd: string | null;
  issuedAt: string;
  paidAt: string | null;
};

export type AdminPaidTotalDraft = {
  currency: string;
  amountMinor: number;
};

export type AdminUserSubscriptionStatisticsDraft = {
  userId: string;
  generatedAt: string;
  subscription: AdminSubscriptionSnapshotDraft | null;
  periodLengthMonths: number | null;
  nextRenewalAt: string | null;
  monthsPaid: number;
  totalPaidMinor: AdminPaidTotalDraft[];
  subscriptionHistory: AdminSubscriptionHistoryDraft[];
  recentInvoices: AdminInvoiceEntryDraft[];
};

/**
 * Everything the view needs, already fetched.
 *
 * `paidInvoices` and `recentInvoices` are separate reads on purpose:
 * `recentInvoices` is a display window over every status, while `paidInvoices`
 * is the PAID-only set the money figures are summed over. Deriving one from
 * the other would either truncate the totals or unbound the table.
 */
export type AdminUserBillingSources = {
  userId: string;
  generatedAt: Date;
  current: Subscription | null;
  history: Subscription[];
  paidInvoices: Invoice[];
  recentInvoices: Invoice[];
};
