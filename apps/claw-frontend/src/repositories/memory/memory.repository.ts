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
    const response = await apiClient.get<{ data: MemoryRecord[]; meta: unknown }>("/memories", params);
    return response.data.data;
  },

  async getMemory(id: string): Promise<MemoryRecord> {
    const response = await apiClient.get<MemoryRecord>(`/memories/${id}`);
    return response.data;
  },

  async createMemory(data: CreateMemoryRequest): Promise<MemoryRecord> {
    const response = await apiClient.post<MemoryRecord>("/memories", data);
    return response.data;
  },

  async updateMemory(
    id: string,
    data: UpdateMemoryRequest,
  ): Promise<MemoryRecord> {
    const response = await apiClient.patch<MemoryRecord>(
      `/memories/${id}`,
      data,
    );
    return response.data;
  },

  async deleteMemory(id: string): Promise<void> {
    await apiClient.delete(`/memories/${id}`);
  },

  async toggleMemory(
    id: string,
  ): Promise<MemoryRecord> {
    const response = await apiClient.patch<MemoryRecord>(`/memories/${id}/toggle`);
    return response.data;
  },
};
