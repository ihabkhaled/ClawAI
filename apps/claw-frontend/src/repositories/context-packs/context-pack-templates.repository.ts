import { apiClient } from '@/services/shared/api-client';
import type { CloneTemplateRequest, ContextPack, ContextPackTemplate } from '@/types';

export const contextPackTemplatesRepository = {
  async list(category?: string): Promise<ContextPackTemplate[]> {
    const params = category ? { category } : undefined;
    const response = await apiClient.get<ContextPackTemplate[]>('/context-pack-templates', params);
    return response.data;
  },

  async clone(templateId: string, data: CloneTemplateRequest): Promise<ContextPack> {
    const response = await apiClient.post<ContextPack>(
      `/context-pack-templates/${templateId}/clone`,
      data,
    );
    return response.data;
  },
};
