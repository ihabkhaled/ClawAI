import { apiClient } from '@/services/shared/api-client';
import type { BotCheckConfig, PowChallenge } from '@/types/bot-check.types';

/** Public bot-check endpoints (auth-service, `/api/v1/auth/bot-check/...`). No session needed. */
export const botCheckRepository = {
  /** Which checks the next sign-up / challenged sign-in must carry. */
  async getConfig(): Promise<BotCheckConfig> {
    const response = await apiClient.get<BotCheckConfig>('/auth/bot-check/config');
    return response.data;
  },

  /** A fresh, single-use proof-of-work challenge (valid 5 minutes, rate limited per IP). */
  async createChallenge(): Promise<PowChallenge> {
    const response = await apiClient.post<PowChallenge>('/auth/bot-check/challenge', {});
    return response.data;
  },
};
