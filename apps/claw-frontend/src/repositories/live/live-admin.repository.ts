import { LIVE_API } from '@/constants/live.constants';
import { apiClient } from '@/services/shared/api-client';
import type {
  LiveAdminOverview,
  LiveAdminPolicy,
  LiveAdminRunStop,
  LiveAdminSavePolicyInput,
  LivePolicyVersion,
} from '@/types/live-admin.types';

/** Live Intelligence admin API (ADMIN_LIVE_MANAGE). */
export const liveAdminRepository = {
  async getOverview(days: number): Promise<LiveAdminOverview> {
    const response = await apiClient.get<LiveAdminOverview>(LIVE_API.ADMIN_OVERVIEW, {
      days: String(days),
    });
    return response.data;
  },

  async stopRun(runId: string): Promise<LiveAdminRunStop> {
    const response = await apiClient.post<LiveAdminRunStop>(LIVE_API.ADMIN_STOP_RUN(runId), {});
    return response.data;
  },

  async getPolicy(): Promise<LiveAdminPolicy> {
    const response = await apiClient.get<LiveAdminPolicy>(LIVE_API.ADMIN_POLICY);
    return response.data;
  },

  /** A blank note is omitted: the server rejects an empty one. */
  async savePolicy(input: LiveAdminSavePolicyInput): Promise<LivePolicyVersion> {
    const note = input.note.trim();
    const response = await apiClient.put<LivePolicyVersion>(LIVE_API.ADMIN_POLICY, {
      config: input.config,
      ...(note === '' ? {} : { note }),
    });
    return response.data;
  },

  async rollbackPolicy(version: number): Promise<LivePolicyVersion> {
    const response = await apiClient.post<LivePolicyVersion>(LIVE_API.ADMIN_POLICY_ROLLBACK, {
      version,
    });
    return response.data;
  },
};
