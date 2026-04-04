import { apiClient } from "@/services/shared/api-client";
import type {
  ContextPack,
  ContextPackItem,
  ContextPackWithItems,
  CreateContextPackRequest,
  UpdateContextPackRequest,
  CreateContextPackItemRequest,
  UpdateContextPackItemRequest,
} from "@/types";

export const contextPacksRepository = {
  async getContextPacks(): Promise<ContextPack[]> {
    const response =
      await apiClient.get<{ data: ContextPack[]; meta: unknown }>("/context-packs");
    return response.data.data;
  },

  async getContextPack(id: string): Promise<ContextPackWithItems> {
    const response = await apiClient.get<ContextPackWithItems>(
      `/context-packs/${id}`,
    );
    return response.data;
  },

  async createContextPack(
    data: CreateContextPackRequest,
  ): Promise<ContextPack> {
    const response = await apiClient.post<ContextPack>(
      "/context-packs",
      data,
    );
    return response.data;
  },

  async updateContextPack(
    id: string,
    data: UpdateContextPackRequest,
  ): Promise<ContextPack> {
    const response = await apiClient.patch<ContextPack>(
      `/context-packs/${id}`,
      data,
    );
    return response.data;
  },

  async deleteContextPack(id: string): Promise<void> {
    await apiClient.delete(`/context-packs/${id}`);
  },

  async addItem(
    contextPackId: string,
    data: CreateContextPackItemRequest,
  ): Promise<ContextPackItem> {
    const response = await apiClient.post<ContextPackItem>(
      `/context-packs/${contextPackId}/items`,
      data,
    );
    return response.data;
  },

  async updateItem(
    contextPackId: string,
    itemId: string,
    data: UpdateContextPackItemRequest,
  ): Promise<ContextPackItem> {
    const response = await apiClient.put<ContextPackItem>(
      `/context-packs/${contextPackId}/items/${itemId}`,
      data,
    );
    return response.data;
  },

  async removeItem(
    contextPackId: string,
    itemId: string,
  ): Promise<void> {
    await apiClient.delete(
      `/context-packs/${contextPackId}/items/${itemId}`,
    );
  },
};
