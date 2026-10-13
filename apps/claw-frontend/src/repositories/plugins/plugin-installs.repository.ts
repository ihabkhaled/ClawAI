import type {
  GrantPluginConsentRequest,
  InstallPluginRequest,
  PluginCredentialStatus,
  PluginInstallView,
  PluginMentionView,
  PluginToolConsentView,
  PutPluginCredentialRequest,
  UpdatePluginInstallRequest,
} from '@claw/shared-types';

import { apiClient } from '@/services/shared/api-client';

const BASE_PATH = '/plugins/installs';

function installPath(id: string): string {
  return `${BASE_PATH}/${encodeURIComponent(id)}`;
}

/** The only place the browser talks to the plugin installs API. Credentials are write-only: no call returns one. */
export const pluginInstallsRepository = {
  async list(): Promise<PluginInstallView[]> {
    const response = await apiClient.get<PluginInstallView[]>(BASE_PATH);
    return response.data;
  },

  async mentions(): Promise<PluginMentionView[]> {
    const response = await apiClient.get<PluginMentionView[]>(`${BASE_PATH}/mentions`);
    return response.data;
  },

  async install(body: InstallPluginRequest): Promise<PluginInstallView> {
    const response = await apiClient.post<PluginInstallView>(BASE_PATH, body);
    return response.data;
  },

  async update(id: string, body: UpdatePluginInstallRequest): Promise<PluginInstallView> {
    const response = await apiClient.patch<PluginInstallView>(installPath(id), body);
    return response.data;
  },

  async uninstall(id: string): Promise<void> {
    await apiClient.delete<void>(installPath(id));
  },

  async putCredential(
    id: string,
    body: PutPluginCredentialRequest,
  ): Promise<PluginCredentialStatus> {
    const response = await apiClient.put<PluginCredentialStatus>(
      `${installPath(id)}/credential`,
      body,
    );
    return response.data;
  },

  async deleteCredential(id: string): Promise<void> {
    await apiClient.delete<void>(`${installPath(id)}/credential`);
  },

  async grantConsent(id: string, body: GrantPluginConsentRequest): Promise<PluginToolConsentView> {
    const response = await apiClient.post<PluginToolConsentView>(
      `${installPath(id)}/consent`,
      body,
    );
    return response.data;
  },

  /** DELETE /plugins/installs/:id/consent/:toolName answers 204 with no body. */
  async revokeConsent(id: string, toolName: string): Promise<void> {
    await apiClient.delete<void>(`${installPath(id)}/consent/${encodeURIComponent(toolName)}`);
  },
};
