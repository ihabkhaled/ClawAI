import {
  PLUGIN_CHAT_GRANTS_PATH,
  PLUGIN_CONSENT_BASE_PATH,
} from '@/constants/plugin-consent-card.constants';
import { apiClient } from '@/services/shared/api-client';
import type {
  PluginChatGrantView,
  PluginConsentDecisionBody,
  PluginConsentRequestView,
} from '@/types/plugin-consent-card.types';

/** The only place the browser talks to the in-chat consent API. Every call is the signed-in user's own. */
export const pluginConsentRequestsRepository = {
  async listPending(): Promise<PluginConsentRequestView[]> {
    const response = await apiClient.get<PluginConsentRequestView[]>(PLUGIN_CONSENT_BASE_PATH);
    return response.data;
  },

  async decide(id: string, body: PluginConsentDecisionBody): Promise<PluginConsentRequestView> {
    const response = await apiClient.post<PluginConsentRequestView>(
      `${PLUGIN_CONSENT_BASE_PATH}/${encodeURIComponent(id)}/decision`,
      body,
    );
    return response.data;
  },

  async listGrants(): Promise<PluginChatGrantView[]> {
    const response = await apiClient.get<PluginChatGrantView[]>(PLUGIN_CHAT_GRANTS_PATH);
    return response.data;
  },

  /** DELETE /plugins/chat-grants/:id answers 204 with no body. */
  async revokeGrant(id: string): Promise<void> {
    await apiClient.delete<void>(`${PLUGIN_CHAT_GRANTS_PATH}/${encodeURIComponent(id)}`);
  },
};
