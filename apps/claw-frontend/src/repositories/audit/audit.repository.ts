import { apiClient } from '@/services/shared/api-client';
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
  AdminCreateUserRequest,
  AdminUserUpdateRequest,
  AdminUserQuery,
  BanUserRequest,
  PresenceSummary,
  SetUserPasswordRequest,
  SetUserPasswordResponse,
} from '@/types';

function toStringParams(params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = String(value);
    }
  }
  return result;
}

export const auditRepository = {
  async getAuditLogs(params: AuditListParams): Promise<AuditListResponse> {
    const response = await apiClient.get<AuditListResponse>(
      '/audits',
      toStringParams(params as Record<string, unknown>),
    );
    return response.data;
  },

  async getAuditStats(): Promise<AuditStats> {
    const response = await apiClient.get<AuditStats>('/audits/stats');
    return response.data;
  },

  async getUsage(params: UsageListParams): Promise<UsageListResponse> {
    const response = await apiClient.get<UsageListResponse>(
      '/usage',
      toStringParams(params as Record<string, unknown>),
    );
    return response.data;
  },

  async getUsageSummary(): Promise<UsageSummary> {
    const response = await apiClient.get<UsageSummary>('/usage/summary');
    return response.data;
  },

  async getCostSummary(): Promise<CostSummary> {
    const response = await apiClient.get<CostSummary>('/usage/cost');
    return response.data;
  },

  async getLatencySummary(): Promise<LatencySummary> {
    const response = await apiClient.get<LatencySummary>('/usage/latency');
    return response.data;
  },

  async getAdminUsers(query?: AdminUserQuery): Promise<AdminUsersResponse> {
    const params = new URLSearchParams();
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== '') {
          params.set(key, String(value));
        }
      }
    }
    const response = await apiClient.get<AdminUsersResponse>(
      params.size > 0 ? `/users?${params.toString()}` : '/users',
    );
    return response.data;
  },

  async issueTemporaryPassword(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/temporary-password`);
  },

  async updateUserRole(userId: string, role: string): Promise<void> {
    await apiClient.patch(`/users/${userId}/role`, { role });
  },

  async createUser(data: AdminCreateUserRequest): Promise<void> {
    await apiClient.post('/users', data);
  },

  async updateUser(userId: string, data: AdminUserUpdateRequest): Promise<void> {
    await apiClient.patch(`/users/${userId}`, data);
  },

  /**
   * Clears a PENDING account's email wall.
   *
   * Distinct from `reactivateUser`, which lifts a suspension: this also sets the
   * verification timestamp and burns the outstanding verification token.
   */
  async activatePendingUser(userId: string): Promise<void> {
    await apiClient.patch(`/users/${userId}/activate`);
  },

  /** Bans an account for a duration or for life, revoking its sessions on the server. */
  async banUser(userId: string, data: BanUserRequest): Promise<void> {
    await apiClient.post(`/users/${userId}/ban`, data);
  },

  async unbanUser(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/unban`);
  },

  /**
   * Sets a password by hand or asks the server to generate one. The generated
   * password is in the response exactly once; the caller must not store it.
   */
  async setUserPassword(
    userId: string,
    data: SetUserPasswordRequest,
  ): Promise<SetUserPasswordResponse> {
    const response = await apiClient.post<SetUserPasswordResponse>(
      `/users/${userId}/password`,
      data,
    );
    return response.data;
  },

  async getPresenceSummary(): Promise<PresenceSummary> {
    const response = await apiClient.get<PresenceSummary>('/users/presence-summary');
    return response.data;
  },

  async deactivateUser(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
  },

  // Lifts a suspension. Deactivation is reversible by design — the account row,
  // its plan assignment and its financial history all survive it — so an
  // administrator must be able to undo one without a database round trip.
  async reactivateUser(userId: string): Promise<void> {
    await apiClient.patch(`/users/${userId}/reactivate`);
  },
};
