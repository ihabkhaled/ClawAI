import { apiClient } from "@/services/shared/api-client";
import type {
  LocalModel,
  PullModelRequest,
  AssignRoleRequest,
  LocalModelsListResponse,
  RuntimesListResponse,
  RuntimeHealthResponse,
} from "@/types";

export const ollamaRepository = {
  async getLocalModels(): Promise<LocalModelsListResponse> {
    const response =
      await apiClient.get<LocalModelsListResponse>("/ollama/models");
    return response.data;
  },

  async pullModel(data: PullModelRequest): Promise<LocalModel> {
    const response = await apiClient.post<LocalModel>(
      "/ollama/models/pull",
      data,
    );
    return response.data;
  },

  async assignRole(data: AssignRoleRequest): Promise<LocalModel> {
    const response = await apiClient.post<LocalModel>(
      "/ollama/models/roles",
      data,
    );
    return response.data;
  },

  async getRuntimes(): Promise<RuntimesListResponse> {
    const response =
      await apiClient.get<RuntimesListResponse>("/ollama/runtimes");
    return response.data;
  },

  async getHealth(): Promise<RuntimeHealthResponse> {
    const response =
      await apiClient.get<RuntimeHealthResponse>("/ollama/health");
    return response.data;
  },
};
