import type {
  AdminUserPlanOverview,
  AdminUserSubscriptionStatistics,
  AdminUserUsageStatistics,
} from '@claw/shared-types';

import { apiClient } from '@/services/shared/api-client';

/**
 * The three per-user panels the admin users page opens from a table row.
 *
 * Three calls across TWO services on purpose: usage and plan standing are
 * auth-service's (`/admin/users/...`), while subscriptions, invoices and money
 * are payment-service's (`/admin/billing/users/...`). Neither service reads the
 * other's tables, so the modal fetches both halves and renders them together.
 *
 * Kept out of `audit.repository.ts` — that file owns the users LIST, and these
 * are per-user detail reads gated on different permissions.
 */
export const adminUserStatisticsRepository = {
  /** Requires ADMIN_USAGE_VIEW server-side. */
  async getUsageStatistics(userId: string): Promise<AdminUserUsageStatistics> {
    const response = await apiClient.get<AdminUserUsageStatistics>(
      `/admin/users/${userId}/usage-statistics`,
    );
    return response.data;
  },

  /** Requires ADMIN_PLANS_MANAGE server-side — the handler overrides the controller default. */
  async getPlanOverview(userId: string): Promise<AdminUserPlanOverview> {
    const response = await apiClient.get<AdminUserPlanOverview>(
      `/admin/users/${userId}/plan-overview`,
    );
    return response.data;
  },

  /** Requires ADMIN_PLANS_MANAGE server-side. Served by payment-service. */
  async getSubscriptionStatistics(userId: string): Promise<AdminUserSubscriptionStatistics> {
    const response = await apiClient.get<AdminUserSubscriptionStatistics>(
      `/admin/billing/users/${userId}/subscription`,
    );
    return response.data;
  },
};
