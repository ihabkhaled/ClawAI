import { apiClient } from '@/services/shared/api-client';
import type { ContextPackVersion, VersionDiff } from '@/types';

export const contextPackVersionsRepository = {
  async list(packId: string): Promise<ContextPackVersion[]> {
    const response = await apiClient.get<ContextPackVersion[]>(`/context-packs/${packId}/versions`);
    return response.data;
  },

  async snapshot(packId: string, summary?: string): Promise<ContextPackVersion> {
    const response = await apiClient.post<ContextPackVersion>(
      `/context-packs/${packId}/versions/snapshot`,
      { summary },
    );
    return response.data;
  },

  async revert(packId: string, version: number): Promise<ContextPackVersion> {
    const response = await apiClient.post<ContextPackVersion>(
      `/context-packs/${packId}/versions/${String(version)}/revert`,
    );
    return response.data;
  },

  async diff(packId: string, fromVersion: number, toVersion: number): Promise<VersionDiff> {
    const response = await apiClient.get<VersionDiff>(
      `/context-packs/${packId}/versions/${String(fromVersion)}/diff/${String(toVersion)}`,
    );
    return response.data;
  },
};
