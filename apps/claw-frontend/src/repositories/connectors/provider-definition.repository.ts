import { apiClient } from '@/services/shared/api-client';
import type {
  CreateProviderDefinition,
  ProviderDefinition,
} from '@/types/provider-definition.types';

type ProviderDefinitionPage = {
  data: ProviderDefinition[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export const providerDefinitionRepository = {
  async list(search?: string): Promise<ProviderDefinitionPage> {
    const response = await apiClient.get<ProviderDefinitionPage>(
      '/connectors/provider-definitions',
      {
        ...(search ? { search } : {}),
        page: '1',
        limit: '100',
      },
    );
    return response.data;
  },
  async create(data: CreateProviderDefinition): Promise<ProviderDefinition> {
    const response = await apiClient.post<ProviderDefinition>(
      '/connectors/provider-definitions',
      data,
    );
    return response.data;
  },
  async setActive(id: string, isActive: boolean): Promise<ProviderDefinition> {
    const response = await apiClient.patch<ProviderDefinition>(
      `/connectors/provider-definitions/${id}/status`,
      { isActive },
    );
    return response.data;
  },
  async update(
    id: string,
    data: Partial<Omit<CreateProviderDefinition, 'key'>>,
  ): Promise<ProviderDefinition> {
    const response = await apiClient.patch<ProviderDefinition>(
      `/connectors/provider-definitions/${id}`,
      data,
    );
    return response.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/connectors/provider-definitions/${id}`);
  },
};
