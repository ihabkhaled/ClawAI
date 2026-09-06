import type {
  AdminCreditMonthConsumption,
  AdminUsageTokenWindow,
  AdminUserInvoiceEntry,
  AdminUserPaidTotal,
  AdminUserPlanAssignment,
  AdminUserPlanOverview,
  AdminUserSubscriptionHistoryEntry,
  AdminUserSubscriptionSnapshot,
  AdminUserSubscriptionStatistics,
  AdminUserUsageStatistics,
} from '@claw/shared-types';

import type { AdminUser } from './audit.types';
import type { TranslateFunction } from './i18n.types';

// ─── Hook returns ───────────────────────────────────────────────────────────

/**
 * `GET /admin/users/:userId/usage-statistics`, as the dialog body reads it.
 *
 * `hasTokenUsage` is derived here rather than in the TSX so the body stays pure
 * composition: three windows all reading zero is an EMPTY panel, not a
 * populated one that happens to show zeros, and the distinction decides which
 * copy the operator sees.
 */
export type UseAdminUserUsageReturn = {
  statistics: AdminUserUsageStatistics | null;
  hasTokenUsage: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

/**
 * The subscription modal's TWO queries, collapsed into one status.
 *
 * The panel is a single answer assembled from auth-service (plan, grant, trial)
 * and payment-service (subscription, invoices, money). Both are gated on
 * `ADMIN_PLANS_MANAGE`, so either one failing leaves the operator with half a
 * picture and no way to tell which half is missing — the modal therefore
 * reports one loading state and one error state for the pair.
 */
export type UseAdminUserSubscriptionReturn = {
  planOverview: AdminUserPlanOverview | null;
  subscriptionStatistics: AdminUserSubscriptionStatistics | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

/**
 * Which user each per-row statistics dialog is pointed at, plus whether the
 * signed-in administrator may open it at all.
 *
 * The permission flags live beside the open state because the button and the
 * dialog have to agree: the users PAGE is gated on `ADMIN_USERS_MANAGE`, but
 * neither endpoint behind these panels is. Gating a button on the parent page's
 * permission hands a user-manager a control that 403s on every click.
 */
export type UseUserStatisticsDialogStateReturn = {
  /** True when the actor holds ADMIN_USAGE_VIEW — the usage endpoint's permission. */
  canViewUsage: boolean;
  /** True when the actor holds ADMIN_PLANS_MANAGE — both billing endpoints' permission. */
  canViewSubscription: boolean;
  usageUser: AdminUser | null;
  openUsage: (user: AdminUser) => void;
  closeUsage: () => void;
  subscriptionUser: AdminUser | null;
  openSubscription: (user: AdminUser) => void;
  closeSubscription: () => void;
};

// ─── Dialog component props ─────────────────────────────────────────────────

export type UserUsageDialogProps = {
  open: boolean;
  user: AdminUser | null;
  onClose: () => void;
  t: TranslateFunction;
};

export type UserUsageDialogBodyProps = {
  userId: string;
  t: TranslateFunction;
};

export type UserUsageTokenWindowCardProps = {
  label: string;
  /** Named `usageWindow`, not `window`, so the prop cannot shadow the DOM global. */
  usageWindow: AdminUsageTokenWindow;
  t: TranslateFunction;
};

export type UserUsageCreditsTableProps = {
  months: AdminCreditMonthConsumption[];
  t: TranslateFunction;
};

export type UserSubscriptionDialogProps = {
  open: boolean;
  user: AdminUser | null;
  onClose: () => void;
  t: TranslateFunction;
};

export type UserSubscriptionDialogBodyProps = {
  userId: string;
  t: TranslateFunction;
};

export type UserSubscriptionSummaryProps = {
  planOverview: AdminUserPlanOverview;
  statistics: AdminUserSubscriptionStatistics;
  t: TranslateFunction;
};

export type UserSubscriptionPlanDetailsProps = {
  planOverview: AdminUserPlanOverview;
  t: TranslateFunction;
};

export type UserSubscriptionCurrentProps = {
  /** `null` for a free account — a valid answer, not an error. */
  subscription: AdminUserSubscriptionSnapshot | null;
  /** Money collected per currency. Never summed across currencies. */
  totalPaidMinor: AdminUserPaidTotal[];
  /**
   * The entitlement grant in force, needed to tell the two no-subscription
   * accounts apart.
   *
   * "No subscription" is not the same statement as "free account". An
   * admin-granted Pro user has no subscription and never will, and describing
   * them as "an ordinary free account" tells an operator the opposite of what
   * the account actually holds.
   */
  assignment: AdminUserPlanAssignment | null;
  t: TranslateFunction;
};

export type UserSubscriptionHistoryTableProps = {
  history: AdminUserSubscriptionHistoryEntry[];
  t: TranslateFunction;
};

export type UserSubscriptionInvoicesTableProps = {
  invoices: AdminUserInvoiceEntry[];
  t: TranslateFunction;
};
