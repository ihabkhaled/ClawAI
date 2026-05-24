import { apiClient } from '@/services/shared/api-client';
import type {
  ApproveSuggestionRequest,
  BulkApproveResult,
  CreateMemoryRequest,
  MemoryAuditLog,
  MemoryPreference,
  MemoryRecord,
  MemorySuggestion,
  MemoryUsageEntry,
  RejectSuggestionRequest,
  UpdateMemoryRequest,
  UpsertMemoryPreferenceRequest,
} from '@/types';

export const memoryRepository = {
  async getMemories(params?: Record<string, string>): Promise<MemoryRecord[]> {
    const response = await apiClient.get<{ data: MemoryRecord[]; meta: unknown }>(
      '/memories',
      params,
    );
    return response.data.data;
  },

  async getMemory(id: string): Promise<MemoryRecord> {
    const response = await apiClient.get<MemoryRecord>(`/memories/${id}`);
    return response.data;
  },

  async createMemory(data: CreateMemoryRequest): Promise<MemoryRecord> {
    const response = await apiClient.post<MemoryRecord>('/memories', data);
    return response.data;
  },

  async updateMemory(id: string, data: UpdateMemoryRequest): Promise<MemoryRecord> {
    const response = await apiClient.patch<MemoryRecord>(`/memories/${id}`, data);
    return response.data;
  },

  async deleteMemory(id: string, confirm: boolean): Promise<void> {
    const query = confirm ? '?confirm=FORGET' : '';
    await apiClient.delete(`/memories/${id}${query}`);
  },

  async toggleMemory(id: string): Promise<MemoryRecord> {
    const response = await apiClient.patch<MemoryRecord>(`/memories/${id}/toggle`);
    return response.data;
  },

  async searchMemories(query: string, limit = 10): Promise<MemoryRecord[]> {
    const response = await apiClient.post<{ data: MemoryRecord[]; meta: unknown }>(
      '/memories/search',
      { query, limit },
    );
    return response.data.data;
  },

  // === Suggestions ===
  async listSuggestions(params?: Record<string, string>): Promise<MemorySuggestion[]> {
    const response = await apiClient.get<{ data: MemorySuggestion[]; meta: unknown }>(
      '/memory-suggestions',
      params,
    );
    return response.data.data;
  },

  async approveSuggestion(id: string, data: ApproveSuggestionRequest): Promise<MemoryRecord> {
    const response = await apiClient.post<MemoryRecord>(`/memory-suggestions/${id}/approve`, data);
    return response.data;
  },

  async rejectSuggestion(id: string, data: RejectSuggestionRequest): Promise<MemorySuggestion> {
    const response = await apiClient.post<MemorySuggestion>(
      `/memory-suggestions/${id}/reject`,
      data,
    );
    return response.data;
  },

  async dismissSuggestion(id: string): Promise<MemorySuggestion> {
    const response = await apiClient.delete<MemorySuggestion>(`/memory-suggestions/${id}`);
    return response.data;
  },

  async bulkApproveSuggestions(suggestionIds: string[]): Promise<BulkApproveResult> {
    const response = await apiClient.post<BulkApproveResult>('/memory-suggestions/bulk-approve', {
      suggestionIds,
    });
    return response.data;
  },

  // === Audit ===
  async listAudit(limit = 100): Promise<MemoryAuditLog[]> {
    const response = await apiClient.get<MemoryAuditLog[]>('/memory-audit', {
      limit: String(limit),
    });
    return response.data;
  },

  async listAuditForMemory(memoryId: string): Promise<MemoryAuditLog[]> {
    const response = await apiClient.get<MemoryAuditLog[]>(`/memory-audit/${memoryId}`);
    return response.data;
  },

  // === Usage ===
  async listUsageForMemory(memoryId: string): Promise<MemoryUsageEntry[]> {
    const response = await apiClient.get<MemoryUsageEntry[]>(`/memory-usage/by-memory/${memoryId}`);
    return response.data;
  },

  async listUsageForMessage(messageId: string): Promise<MemoryUsageEntry[]> {
    const response = await apiClient.get<MemoryUsageEntry[]>(
      `/memory-usage/by-message/${messageId}`,
    );
    return response.data;
  },

  // === Preferences ===
  async getPreferences(): Promise<MemoryPreference> {
    const response = await apiClient.get<MemoryPreference>('/memory-preferences');
    return response.data;
  },

  async upsertPreferences(data: UpsertMemoryPreferenceRequest): Promise<MemoryPreference> {
    const response = await apiClient.put<MemoryPreference>('/memory-preferences', data);
    return response.data;
  },
};
