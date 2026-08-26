import { apiClient } from '@/services/shared/api-client';
import type {
  ChainDsl,
  ChainRunView,
  CreateChainRequest,
  InstantiateChainTemplateRequest,
  WorkspaceChain,
  WorkspaceChainRun,
  WorkspaceChainTemplate,
} from '@/types';

export const workspaceChainRepository = {
  async listTemplates(): Promise<WorkspaceChainTemplate[]> {
    const response = await apiClient.get<WorkspaceChainTemplate[]>('/workspace/chain-templates');
    return response.data;
  },

  async draftFromNl(prompt: string): Promise<ChainDsl> {
    const response = await apiClient.post<{ dsl: ChainDsl }>('/workspace/chains/draft-from-nl', {
      prompt,
    });
    return response.data.dsl;
  },

  async create(data: CreateChainRequest): Promise<WorkspaceChain> {
    const response = await apiClient.post<WorkspaceChain>('/workspace/chains', data);
    return response.data;
  },

  async instantiateTemplate(
    key: string,
    data: InstantiateChainTemplateRequest,
  ): Promise<WorkspaceChain> {
    const response = await apiClient.post<WorkspaceChain>(
      `/workspace/chain-templates/${key}/instantiate`,
      data,
    );
    return response.data;
  },

  async listChains(): Promise<WorkspaceChain[]> {
    const response = await apiClient.get<WorkspaceChain[]>('/workspace/chains');
    return response.data;
  },

  async runChain(chainId: string): Promise<ChainRunView> {
    const response = await apiClient.post<ChainRunView>(`/workspace/chains/${chainId}/run`);
    return response.data;
  },

  async resumeChainRun(chainId: string, runId: string): Promise<ChainRunView> {
    const response = await apiClient.post<ChainRunView>(
      `/workspace/chains/${chainId}/runs/${runId}/resume`,
    );
    return response.data;
  },

  async listChainRuns(chainId: string, limit = 20): Promise<WorkspaceChainRun[]> {
    const response = await apiClient.get<WorkspaceChainRun[]>(`/workspace/chains/${chainId}/runs`, {
      limit: String(limit),
    });
    return response.data;
  },
};
