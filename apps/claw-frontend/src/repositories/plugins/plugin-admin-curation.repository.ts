import type {
  AdminAuditRowView,
  AdminRuleView,
  AdminServerStatus,
  AdminServerView,
  CreateAdminRuleRequest,
  CuratedEntryRequest,
  CuratedEntryView,
  CuratedPreviewRequest,
  CuratedPreviewView,
} from '@claw/shared-types';

import {
  ADMIN_CURATION_AUDIT_LIMIT,
  ADMIN_CURATION_BASE_PATH,
} from '@/constants/plugin-admin-curation.constants';
import { apiClient } from '@/services/shared/api-client';

const CURATED = `${ADMIN_CURATION_BASE_PATH}/curated`;
const SERVERS = `${ADMIN_CURATION_BASE_PATH}/servers`;
const RULES = `${ADMIN_CURATION_BASE_PATH}/rules`;

const slugPath = (slug: string): string => `${CURATED}/${encodeURIComponent(slug)}`;

/** Admin curation calls (PLUGINS_ADMIN): curated entries, the approval queue, rules and the audit log. */
export const pluginAdminCurationRepository = {
  async listEntries(): Promise<CuratedEntryView[]> {
    const response = await apiClient.get<CuratedEntryView[]>(CURATED);
    return response.data;
  },

  async previewTools(body: CuratedPreviewRequest): Promise<CuratedPreviewView> {
    const response = await apiClient.post<CuratedPreviewView>(`${CURATED}/preview`, body);
    return response.data;
  },

  async createEntry(body: CuratedEntryRequest): Promise<CuratedEntryView> {
    const response = await apiClient.post<CuratedEntryView>(CURATED, body);
    return response.data;
  },

  async updateEntry(slug: string, body: CuratedEntryRequest): Promise<CuratedEntryView> {
    const response = await apiClient.put<CuratedEntryView>(slugPath(slug), body);
    return response.data;
  },

  async setEnabled(slug: string, enabled: boolean): Promise<CuratedEntryView> {
    const response = await apiClient.patch<CuratedEntryView>(`${slugPath(slug)}/state`, {
      enabled,
    });
    return response.data;
  },

  async checkHealth(slug: string): Promise<CuratedEntryView> {
    const response = await apiClient.post<CuratedEntryView>(`${slugPath(slug)}/health-check`);
    return response.data;
  },

  async removeEntry(slug: string): Promise<void> {
    await apiClient.delete(slugPath(slug));
  },

  async listServers(status: AdminServerStatus): Promise<AdminServerView[]> {
    const response = await apiClient.get<AdminServerView[]>(SERVERS, { status });
    return response.data;
  },

  async approveServer(id: string): Promise<AdminServerView> {
    const response = await apiClient.post<AdminServerView>(`${SERVERS}/${id}/approve`);
    return response.data;
  },

  async rejectServer(id: string, reason: string): Promise<AdminServerView> {
    const response = await apiClient.post<AdminServerView>(`${SERVERS}/${id}/reject`, { reason });
    return response.data;
  },

  async listRules(): Promise<AdminRuleView[]> {
    const response = await apiClient.get<AdminRuleView[]>(RULES);
    return response.data;
  },

  async createRule(body: CreateAdminRuleRequest): Promise<AdminRuleView> {
    const response = await apiClient.post<AdminRuleView>(RULES, body);
    return response.data;
  },

  async removeRule(id: string): Promise<void> {
    await apiClient.delete(`${RULES}/${id}`);
  },

  async listAudit(): Promise<AdminAuditRowView[]> {
    const response = await apiClient.get<AdminAuditRowView[]>(`${ADMIN_CURATION_BASE_PATH}/audit`, {
      limit: String(ADMIN_CURATION_AUDIT_LIMIT),
    });
    return response.data;
  },
};
