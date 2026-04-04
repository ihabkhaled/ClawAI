import { apiClient } from "@/services/shared/api-client";
import type {
  AuditListResponse,
  AuditStats,
  UsageListResponse,
  UsageSummary,
  CostSummary,
  LatencySummary,
  AuditListParams,
  UsageListParams,
  AdminUsersResponse,
} from "@/types";

function toStringParams(params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      result[key] = String(value);
    }
  }
  return result;
}

export const auditRepository = {
  async getAuditLogs(params: AuditListParams): Promise<AuditListResponse> {
    const response = await apiClient.get<AuditListResponse>(
      "/audits",
      toStringParams(params as Record<string, unknown>),
    );
    return response.data;
  },

  async getAuditStats(): Promise<AuditStats> {
    const response = await apiClient.get<AuditStats>("/audits/stats");
    return response.data;
  },

  async getUsage(params: UsageListParams): Promise<UsageListResponse> {
    const response = await apiClient.get<UsageListResponse>(
      "/usage",
      toStringParams(params as Record<string, unknown>),
    );
    return response.data;
  },

  async getUsageSummary(): Promise<UsageSummary> {
    const response = await apiClient.get<UsageSummary>("/usage/summary");
    return response.data;
  },

  async getCostSummary(): Promise<CostSummary> {
    const response = await apiClient.get<CostSummary>("/usage/cost");
    return response.data;
  },

  async getLatencySummary(): Promise<LatencySummary> {
    const response = await apiClient.get<LatencySummary>("/usage/latency");
    return response.data;
  },

  async getAdminUsers(): Promise<AdminUsersResponse> {
    const response = await apiClient.get<AdminUsersResponse>("/auth/users");
    return response.data;
  },

  async updateUserRole(userId: string, role: string): Promise<void> {
    await apiClient.patch(`/auth/users/${userId}/role`, { role });
  },

  async deactivateUser(userId: string): Promise<void> {
    await apiClient.patch(`/auth/users/${userId}/deactivate`);
  },
};
