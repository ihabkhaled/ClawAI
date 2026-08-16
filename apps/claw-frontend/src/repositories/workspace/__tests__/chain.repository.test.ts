import { beforeEach, describe, expect, it, vi } from 'vitest';

import { workspaceChainRepository } from '@/repositories/workspace/chain.repository';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe('workspaceChainRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listTemplates fetches the template catalog', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'tmpl-1' }] });
    const result = await workspaceChainRepository.listTemplates();
    expect(mockGet).toHaveBeenCalledWith('/workspace/chain-templates');
    expect(result).toEqual([{ id: 'tmpl-1' }]);
  });

  it('instantiateTemplate posts to the instantiate endpoint with the given key and body', async () => {
    mockPost.mockResolvedValue({ data: { id: 'chain-1' } });
    const result = await workspaceChainRepository.instantiateTemplate('ticket-and-notify', {
      name: 'My chain',
      connectorSelections: { jira: 'conn-1' },
    });
    expect(mockPost).toHaveBeenCalledWith(
      '/workspace/chain-templates/ticket-and-notify/instantiate',
      {
        name: 'My chain',
        connectorSelections: { jira: 'conn-1' },
      },
    );
    expect(result).toEqual({ id: 'chain-1' });
  });

  it('listChains fetches all chains', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'chain-1' }] });
    const result = await workspaceChainRepository.listChains();
    expect(mockGet).toHaveBeenCalledWith('/workspace/chains');
    expect(result).toEqual([{ id: 'chain-1' }]);
  });

  it('runChain posts to the run endpoint for the given chain', async () => {
    mockPost.mockResolvedValue({ data: { id: 'run-1' } });
    const result = await workspaceChainRepository.runChain('chain-1');
    expect(mockPost).toHaveBeenCalledWith('/workspace/chains/chain-1/run');
    expect(result).toEqual({ id: 'run-1' });
  });

  it('resumeChainRun posts to the resume endpoint for the given chain and run', async () => {
    mockPost.mockResolvedValue({ data: { id: 'run-1' } });
    const result = await workspaceChainRepository.resumeChainRun('chain-1', 'run-1');
    expect(mockPost).toHaveBeenCalledWith('/workspace/chains/chain-1/runs/run-1/resume');
    expect(result).toEqual({ id: 'run-1' });
  });

  it('listChainRuns defaults limit to 20, serialised as a string', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await workspaceChainRepository.listChainRuns('chain-1');
    expect(mockGet).toHaveBeenCalledWith('/workspace/chains/chain-1/runs', { limit: '20' });
  });

  it('listChainRuns serialises a custom limit as a string', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await workspaceChainRepository.listChainRuns('chain-1', 5);
    expect(mockGet).toHaveBeenCalledWith('/workspace/chains/chain-1/runs', { limit: '5' });
  });
});
