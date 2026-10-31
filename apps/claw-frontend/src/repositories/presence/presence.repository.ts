import { apiClient } from '@/services/shared/api-client';

export const presenceRepository = {
  /**
   * "I am here." The server writes lastSeenAt at most once a minute per user and
   * answers 204. Not plan usage, not logged server-side.
   */
  async sendHeartbeat(): Promise<void> {
    await apiClient.post('/users/me/heartbeat');
  },
};
