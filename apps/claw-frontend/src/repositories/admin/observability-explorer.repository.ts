import type {
  AdminObsDetail,
  AdminObsFilterOptions,
  AdminObsHealthReport,
  AdminObsOverview,
  AdminObsPage,
  AdminObsUsersExport,
} from '@claw/shared-types';

import { OBSERVABILITY_API_BASE } from '@/constants/observability-pages.constants';
import { apiClient } from '@/services/shared/api-client';
import type {
  AdminUsageLeaderboardPage,
  AdminUsageRequestsPage,
  AdminUsageTimeseries,
  AdminUserConsumptionDetail,
  ExplorerListQuery,
  ExplorerParams,
  FailuresQuery,
  FailuresResponse,
  TracingQuery,
  TracingResponse,
} from '@/types/observability-explorer.types';
import type {
  ObservabilityEntityKind,
  ObservabilityExportQuery,
  ObservabilityListQuery,
} from '@/types/observability-pages-api.types';

const EXPLORER = '/admin/usage-explorer';
const OBSERVABILITY = OBSERVABILITY_API_BASE;

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
  /** Every matching user (server-capped), for the CSV download. Same period, filters, search and order as the table. */
  async exportUsers(
    range: ExplorerParams,
    list: ObservabilityExportQuery,
  ): Promise<AdminObsUsersExport> {
    const response = await apiClient.get<AdminObsUsersExport>(
      `${OBSERVABILITY}/users/export`,
      toParams(range, list),
    );
    return response.data;
  },

  async getFilterOptions(range: ExplorerParams): Promise<AdminObsFilterOptions> {
    const response = await apiClient.get<AdminObsFilterOptions>(
      `${OBSERVABILITY}/filter-options`,
      toParams(range),
    );
    return response.data;
  },

  /** Settled versus refunded holds overall and per provider, most refunds first. */
  async getHealth(range: ExplorerParams): Promise<AdminObsHealthReport> {
    const response = await apiClient.get<AdminObsHealthReport>(
      `${OBSERVABILITY}/health`,
      toParams(range),
    );
    return response.data;
  },

  async getOverview(range: ExplorerParams): Promise<AdminObsOverview> {
    const response = await apiClient.get<AdminObsOverview>(
      `${OBSERVABILITY}/overview`,
      toParams(range),
    );
    return response.data;
  },

  /** Users, providers, models, plans or workflows: one row each, with derived values. */
  async getList(
    kind: ObservabilityEntityKind,
    range: ExplorerParams,
    list: ObservabilityListQuery,
  ): Promise<AdminObsPage> {
    const response = await apiClient.get<AdminObsPage>(
      `${OBSERVABILITY}/${kind}`,
      toParams(range, list),
    );
    return response.data;
  },

  async getProviderDetail(provider: string, range: ExplorerParams): Promise<AdminObsDetail> {
    const response = await apiClient.get<AdminObsDetail>(
      `${OBSERVABILITY}/providers/${encodeURIComponent(provider)}`,
      toParams(range),
    );
    return response.data;
  },

  /** A model id contains "/" and ":", so provider and model travel in the query string. */
  async getModelDetail(
    provider: string,
    model: string,
    range: ExplorerParams,
  ): Promise<AdminObsDetail> {
    const response = await apiClient.get<AdminObsDetail>(
      `${OBSERVABILITY}/models/detail`,
      toParams(range, { provider, model }),
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
