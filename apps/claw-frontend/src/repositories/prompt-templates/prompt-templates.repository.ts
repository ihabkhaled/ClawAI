import { apiClient } from '@/services/shared/api-client';
import type {
  CreatePromptTemplateInput,
  ListPromptTemplatesParams,
  PromptTemplate,
  PromptTemplatePage,
  UpdatePromptTemplateInput,
} from '@/types';

/** The api client takes string query values; omitted filters are not sent. */
function toQuery(params: ListPromptTemplatesParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.q !== undefined) {
    query.q = params.q;
  }
  if (params.tag !== undefined) {
    query.tag = params.tag;
  }
  if (params.favorite !== undefined) {
    query.favorite = String(params.favorite);
  }
  if (params.cursor !== undefined) {
    query.cursor = params.cursor;
  }
  if (params.limit !== undefined) {
    query.limit = String(params.limit);
  }
  return query;
}

const BASE_PATH = '/chat-prompt-templates';

/**
 * The only place the browser talks to the prompt-library API (ADR-138).
 * The owner is resolved from the JWT server-side; no user id is ever sent.
 */
export const promptTemplatesRepository = {
  async list(params: ListPromptTemplatesParams): Promise<PromptTemplatePage> {
    const response = await apiClient.get<PromptTemplatePage>(BASE_PATH, toQuery(params));
    return response.data;
  },

  async create(input: CreatePromptTemplateInput): Promise<PromptTemplate> {
    const response = await apiClient.post<PromptTemplate>(BASE_PATH, input);
    return response.data;
  },

  async update(id: string, input: UpdatePromptTemplateInput): Promise<PromptTemplate> {
    const response = await apiClient.patch<PromptTemplate>(`${BASE_PATH}/${id}`, input);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE_PATH}/${id}`);
  },

  /** Bumps usage stats; called when a template is inserted into the composer. */
  async markUsed(id: string): Promise<PromptTemplate> {
    const response = await apiClient.post<PromptTemplate>(`${BASE_PATH}/${id}/use`);
    return response.data;
  },
};
