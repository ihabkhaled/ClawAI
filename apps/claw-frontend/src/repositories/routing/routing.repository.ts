import { apiClient } from '@/services/shared/api-client';
import type {
  CreatePolicyRequest,
  DecisionsListResponse,
  EvaluateRouteRequest,
  EvaluateRouteResponse,
  ExportBundle,
  PoliciesListResponse,
  PromotedTestFixture,
  ReplayBatchResult,
  ReplayCaseDetail,
  ReplayFilters,
  ReplayRunsListResponse,
  RecoveryStats,
  ReviewCaseRequest,
  RoutingPolicy,
  RunComparisonResult,
  UpdatePolicyRequest,
} from '@/types';

export const routingRepository = {
  async getPolicies(params?: Record<string, string>): Promise<PoliciesListResponse> {
    const response = await apiClient.get<PoliciesListResponse>('/routing/policies', params);
    return response.data;
  },

  async createPolicy(data: CreatePolicyRequest): Promise<RoutingPolicy> {
    const response = await apiClient.post<RoutingPolicy>('/routing/policies', data);
    return response.data;
  },

  async updatePolicy(id: string, data: UpdatePolicyRequest): Promise<RoutingPolicy> {
    const response = await apiClient.patch<RoutingPolicy>(`/routing/policies/${id}`, data);
    return response.data;
  },

  async deletePolicy(id: string): Promise<void> {
    await apiClient.delete(`/routing/policies/${id}`);
  },

  async getDecisions(
    threadId: string,
    params?: Record<string, string>,
  ): Promise<DecisionsListResponse> {
    const response = await apiClient.get<DecisionsListResponse>(
      `/routing/decisions/${threadId}`,
      params,
    );
    return response.data;
  },

  async evaluateRoute(data: EvaluateRouteRequest): Promise<EvaluateRouteResponse> {
    const response = await apiClient.post<EvaluateRouteResponse>('/routing/evaluate', data);
    return response.data;
  },

  async replayRouting(filters: ReplayFilters): Promise<ReplayBatchResult> {
    const response = await apiClient.post<ReplayBatchResult>('/routing/replay', filters);
    return response.data;
  },

  async getReplayRuns(params?: Record<string, string>): Promise<ReplayRunsListResponse> {
    const response = await apiClient.get<ReplayRunsListResponse>('/routing/replay/runs', params);
    return response.data;
  },

  async getReplayRunCases(runId: string): Promise<ReplayCaseDetail[]> {
    const response = await apiClient.get<ReplayCaseDetail[]>(`/routing/replay/runs/${runId}/cases`);
    return response.data;
  },

  async getSuspiciousCases(runId: string): Promise<ReplayCaseDetail[]> {
    const response = await apiClient.get<ReplayCaseDetail[]>(
      `/routing/replay/runs/${runId}/suspicious`,
    );
    return response.data;
  },

  async reviewCase(caseId: string, data: ReviewCaseRequest): Promise<ReplayCaseDetail> {
    const response = await apiClient.post<ReplayCaseDetail>(
      `/routing/replay/cases/${caseId}/review`,
      data,
    );
    return response.data;
  },

  async exportReplayRun(runId: string): Promise<ExportBundle> {
    const response = await apiClient.get<ExportBundle>(`/routing/replay/runs/${runId}/export`);
    return response.data;
  },

  async promoteCase(caseId: string): Promise<PromotedTestFixture> {
    const response = await apiClient.post<PromotedTestFixture>(
      `/routing/replay/cases/${caseId}/promote`,
    );
    return response.data;
  },

  async compareRuns(runId1: string, runId2: string): Promise<RunComparisonResult> {
    const response = await apiClient.get<RunComparisonResult>('/routing/replay/runs/compare', {
      runId1,
      runId2,
    });
    return response.data;
  },

  async getRecoveryStats(limit = 20): Promise<RecoveryStats> {
    const response = await apiClient.get<RecoveryStats>('/routing/recovery/stats', {
      limit: String(limit),
    });
    return response.data;
  },
};
