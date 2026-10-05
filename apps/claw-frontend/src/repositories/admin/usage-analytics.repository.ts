import type { AdminUsageAnalytics, AdminUserUsageBreakdown } from '@claw/shared-types';

import { apiClient } from '@/services/shared/api-client';
import type { UsageAnalyticsQuery, UsageRangeQuery } from '@/types/admin-usage-analytics.types';

/**
 * Query-string params as the api-client takes them: strings only. Undefined
 * values are dropped so the server's defaults apply instead of the literal
 * string "undefined".
 */
function toParams(query: UsageAnalyticsQuery): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params[key] = String(value);
    }
  }
  return params;
}

/**
 * Admin usage analytics, both served by auth-service under `/admin`. Both need
 * ADMIN_USAGE_VIEW server-side.
 */
export const adminUsageAnalyticsRepository = {
  async getUserBreakdown(userId: string, query: UsageRangeQuery): Promise<AdminUserUsageBreakdown> {
    const response = await apiClient.get<AdminUserUsageBreakdown>(
      `/admin/users/${encodeURIComponent(userId)}/usage-breakdown`,
      toParams(query),
    );
    return response.data;
  },

  async getOverview(query: UsageAnalyticsQuery): Promise<AdminUsageAnalytics> {
    const response = await apiClient.get<AdminUsageAnalytics>(
      '/admin/usage-analytics',
      toParams(query),
    );
    return response.data;
  },
};
