import { RouterProvider } from '../../../generated/prisma';
import { CloudRouterEligibilityManager } from '../managers/cloud-router-eligibility.manager';
import { type ModelDeploymentRepository } from '../repositories/model-deployment.repository';
import { type RoutingContext } from '../types/routing.types';

const baseContext: RoutingContext = { message: 'hello', threadId: 'thread-1' };

const buildManager = (findEligibleForCloudRouting: jest.Mock): CloudRouterEligibilityManager => {
  const deployments = { findEligibleForCloudRouting };
  return new CloudRouterEligibilityManager(deployments as unknown as ModelDeploymentRepository);
};

describe('CloudRouterEligibilityManager.resolveEligibleDeployments', () => {
  it('returns whatever the repository resolves as eligible, unmodified', async () => {
    const eligible = [
      { id: 'dep_1', provider: RouterProvider.GEMINI, providerModelId: 'gemini-2.5-flash' },
    ];
    const manager = buildManager(jest.fn().mockResolvedValue(eligible));

    const result = await manager.resolveEligibleDeployments(baseContext);

    expect(result).toEqual(eligible);
  });

  it('returns an empty list when nothing qualifies, rather than throwing', async () => {
    const manager = buildManager(jest.fn().mockResolvedValue([]));

    const result = await manager.resolveEligibleDeployments(baseContext);

    expect(result).toEqual([]);
  });

  it('does no scoring or ordering of its own — it hands back exactly what the hard filter returned', async () => {
    const eligible = [
      { id: 'dep_2', provider: RouterProvider.OLLAMA_CLOUD, providerModelId: 'qwen3:32b' },
      { id: 'dep_1', provider: RouterProvider.GEMINI, providerModelId: 'gemini-2.5-flash' },
    ];
    const manager = buildManager(jest.fn().mockResolvedValue(eligible));

    const result = await manager.resolveEligibleDeployments(baseContext);

    expect(result.map((deployment) => deployment.id)).toEqual(['dep_2', 'dep_1']);
  });
});
