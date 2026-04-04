import { apiClient } from "@/services/shared/api-client";
import type {
  RoutingPolicy,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  PoliciesListResponse,
  DecisionsListResponse,
  EvaluateRouteRequest,
  EvaluateRouteResponse,
} from "@/types";

export const routingRepository = {
  async getPolicies(
    params?: Record<string, string>,
  ): Promise<PoliciesListResponse> {
    const response = await apiClient.get<PoliciesListResponse>(
      "/routing/policies",
      params,
    );
    return response.data;
  },

  async createPolicy(data: CreatePolicyRequest): Promise<RoutingPolicy> {
    const response = await apiClient.post<RoutingPolicy>(
      "/routing/policies",
      data,
    );
    return response.data;
  },

  async updatePolicy(
    id: string,
    data: UpdatePolicyRequest,
  ): Promise<RoutingPolicy> {
    const response = await apiClient.patch<RoutingPolicy>(
      `/routing/policies/${id}`,
      data,
    );
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

  async evaluateRoute(
    data: EvaluateRouteRequest,
  ): Promise<EvaluateRouteResponse> {
    const response = await apiClient.post<EvaluateRouteResponse>(
      "/routing/evaluate",
      data,
    );
    return response.data;
  },
};
