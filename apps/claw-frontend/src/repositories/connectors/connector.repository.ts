import { apiClient } from "@/services/shared/api-client";
import type {
  Connector,
  CreateConnectorRequest,
  UpdateConnectorRequest,
  ConnectorsListResponse,
  HealthCheckResponse,
  SyncModelsResponse,
  ConnectorModelsResponse,
} from "@/types";

export const connectorRepository = {
  async createConnector(data: CreateConnectorRequest): Promise<Connector> {
    const response = await apiClient.post<Connector>("/connectors", data);
    return response.data;
  },

  async getConnectors(
    params?: Record<string, string>,
  ): Promise<ConnectorsListResponse> {
    const response = await apiClient.get<ConnectorsListResponse>(
      "/connectors",
      params,
    );
    return response.data;
  },

  async getConnector(id: string): Promise<Connector> {
    const response = await apiClient.get<Connector>(`/connectors/${id}`);
    return response.data;
  },

  async updateConnector(
    id: string,
    data: UpdateConnectorRequest,
  ): Promise<Connector> {
    const response = await apiClient.patch<Connector>(
      `/connectors/${id}`,
      data,
    );
    return response.data;
  },

  async deleteConnector(id: string): Promise<void> {
    await apiClient.delete(`/connectors/${id}`);
  },

  async testConnector(id: string): Promise<HealthCheckResponse> {
    const response = await apiClient.post<HealthCheckResponse>(
      `/connectors/${id}/test`,
    );
    return response.data;
  },

  async syncModels(id: string): Promise<SyncModelsResponse> {
    const response = await apiClient.post<SyncModelsResponse>(
      `/connectors/${id}/sync`,
    );
    return response.data;
  },

  async getModels(id: string): Promise<ConnectorModelsResponse> {
    const response = await apiClient.get<ConnectorModelsResponse>(
      `/connectors/${id}/models`,
    );
    return response.data;
  },
};
