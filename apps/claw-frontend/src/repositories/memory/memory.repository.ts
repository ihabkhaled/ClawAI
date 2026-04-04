import { apiClient } from "@/services/shared/api-client";
import type {
  MemoryRecord,
  CreateMemoryRequest,
  UpdateMemoryRequest,
} from "@/types";

export const memoryRepository = {
  async getMemories(
    params?: Record<string, string>,
  ): Promise<MemoryRecord[]> {
    const response = await apiClient.get<MemoryRecord[]>("/memory", params);
    return response.data;
  },

  async getMemory(id: string): Promise<MemoryRecord> {
    const response = await apiClient.get<MemoryRecord>(`/memory/${id}`);
    return response.data;
  },

  async createMemory(data: CreateMemoryRequest): Promise<MemoryRecord> {
    const response = await apiClient.post<MemoryRecord>("/memory", data);
    return response.data;
  },

  async updateMemory(
    id: string,
    data: UpdateMemoryRequest,
  ): Promise<MemoryRecord> {
    const response = await apiClient.put<MemoryRecord>(
      `/memory/${id}`,
      data,
    );
    return response.data;
  },

  async deleteMemory(id: string): Promise<void> {
    await apiClient.delete(`/memory/${id}`);
  },

  async toggleMemory(
    id: string,
    isEnabled: boolean,
  ): Promise<MemoryRecord> {
    const response = await apiClient.put<MemoryRecord>(`/memory/${id}`, {
      isEnabled,
    });
    return response.data;
  },
};
