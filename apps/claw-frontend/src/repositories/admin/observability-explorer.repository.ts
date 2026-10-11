import { apiClient } from '@/services/shared/api-client';
import type {
  AdminUsageLeaderboardPage,
  AdminUsageRequestsPage,
  AdminUsageTimeseries,
  AdminUsageUsersPage,
  AdminUserConsumptionDetail,
  ExplorerListQuery,
  ExplorerParams,
  FailuresQuery,
  FailuresResponse,
  TracingQuery,
  TracingResponse,
} from '@/types/observability-explorer.types';

const EXPLORER = '/admin/usage-explorer';

/** Strings only, empty and undefined dropped so the server's defaults apply. */
function toParams(...sources: Array<object | undefined>): ExplorerParams {
  const params: ExplorerParams = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(source ?? {})) {
      if (value !== undefined && value !== '' && value !== null) {
        params[key] = String(value);
      }
    }
  }
  return params;
}

/**
 * Admin usage explorer (auth-service, ADMIN_USAGE_VIEW) and the audit-service
 * failures and tracing views. The explorer returns full emails to admins only.
 */
export const observabilityExplorerRepository = {
  async getUsers(range: ExplorerParams, list: ExplorerListQuery): Promise<AdminUsageUsersPage> {
    const response = await apiClient.get<AdminUsageUsersPage>(
      `${EXPLORER}/users`,
      toParams(range, list),
    );
    return response.data;
  },

  async getLeaderboard(
    range: ExplorerParams,
    list: ExplorerListQuery,
  ): Promise<AdminUsageLeaderboardPage> {
    const response = await apiClient.get<AdminUsageLeaderboardPage>(
      `${EXPLORER}/leaderboard`,
      toParams(range, list),
    );
    return response.data;
  },

  async getTimeseries(range: ExplorerParams, userId: string): Promise<AdminUsageTimeseries> {
    const response = await apiClient.get<AdminUsageTimeseries>(
      `${EXPLORER}/timeseries`,
      toParams(range, { userId }),
    );
    return response.data;
  },

  async getUserDetail(userId: string, range: ExplorerParams): Promise<AdminUserConsumptionDetail> {
    const response = await apiClient.get<AdminUserConsumptionDetail>(
      `${EXPLORER}/users/${encodeURIComponent(userId)}`,
      toParams(range),
    );
    return response.data;
  },

  async getUserRequests(
    userId: string,
    range: ExplorerParams,
    list: ExplorerListQuery,
  ): Promise<AdminUsageRequestsPage> {
    const response = await apiClient.get<AdminUsageRequestsPage>(
      `${EXPLORER}/users/${encodeURIComponent(userId)}/requests`,
      toParams(range, list),
    );
    return response.data;
  },

  async getFailures(query: FailuresQuery): Promise<FailuresResponse> {
    const response = await apiClient.get<FailuresResponse>('/audits/failures', toParams(query));
    return response.data;
  },

  async getTracing(query: TracingQuery): Promise<TracingResponse> {
    const response = await apiClient.get<TracingResponse>('/usage/tracing', toParams(query));
    return response.data;
  },
};
