import { NOTIFICATIONS_API_BASE } from '@/constants/notifications.constants';
import { apiClient } from '@/services/shared/api-client';
import type {
  NotificationPage,
  NotificationPreferences,
  NotificationPreferencesPatch,
} from '@/types/notifications.types';

/**
 * The only place the browser talks to the notifications API. No route takes a user id: whose
 * notifications these are comes from the session.
 */
class NotificationsRepository {
  /** `cursor` is an opaque row id from the previous page, never an offset. */
  async list(
    cursor: string | null,
    limit: number,
    signal?: AbortSignal,
  ): Promise<NotificationPage> {
    const params: Record<string, string> = { limit: String(limit) };
    if (cursor !== null) {
      params['cursor'] = cursor;
    }
    const response = await apiClient.get<NotificationPage>(NOTIFICATIONS_API_BASE, params, {
      signal,
    });
    return response.data;
  }

  async markRead(id: string): Promise<{ unreadCount: number }> {
    const response = await apiClient.post<{ unreadCount: number }>(
      `${NOTIFICATIONS_API_BASE}/${encodeURIComponent(id)}/read`,
    );
    return response.data;
  }

  async markAllRead(): Promise<{ unreadCount: number }> {
    const response = await apiClient.post<{ unreadCount: number }>(
      `${NOTIFICATIONS_API_BASE}/read-all`,
    );
    return response.data;
  }

  async getPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.get<NotificationPreferences>(
      `${NOTIFICATIONS_API_BASE}/preferences`,
    );
    return response.data;
  }

  async savePreferences(patch: NotificationPreferencesPatch): Promise<NotificationPreferences> {
    const response = await apiClient.put<NotificationPreferences>(
      `${NOTIFICATIONS_API_BASE}/preferences`,
      patch,
    );
    return response.data;
  }
}

export const notificationsRepository = new NotificationsRepository();
