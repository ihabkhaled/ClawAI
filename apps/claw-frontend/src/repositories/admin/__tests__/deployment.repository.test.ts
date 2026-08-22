import { DeploymentTriggerMode } from '@claw/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deploymentRepository } from '@/repositories/admin/deployment.repository';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe('deployment repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the authenticated admin deployment endpoint', async () => {
    const status = { state: 'completed', targetSha: 'a'.repeat(40) };
    mockGet.mockResolvedValue({ data: status });

    await expect(deploymentRepository.get()).resolves.toBe(status);
    expect(mockGet).toHaveBeenCalledWith('/admin/deployment');
  });

  it('posts a manual trigger with its mode and commit', async () => {
    const result = { dispatched: true };
    mockPost.mockResolvedValue({ data: result });

    await expect(
      deploymentRepository.trigger({
        mode: DeploymentTriggerMode.SHA,
        targetSha: 'a'.repeat(40),
      }),
    ).resolves.toBe(result);
    expect(mockPost).toHaveBeenCalledWith('/admin/deployment/trigger', {
      mode: DeploymentTriggerMode.SHA,
      targetSha: 'a'.repeat(40),
    });
  });

  it('posts a reset with no body', async () => {
    mockPost.mockResolvedValue({ data: { reset: true, clearedSha: null } });

    await expect(deploymentRepository.reset()).resolves.toMatchObject({ reset: true });
    expect(mockPost).toHaveBeenCalledWith('/admin/deployment/reset');
  });

  it('posts the automatic-deploy switch', async () => {
    mockPost.mockResolvedValue({
      data: { manualTriggerEnabled: true, automaticDeployEnabled: false },
    });

    await expect(deploymentRepository.setAutomation(false)).resolves.toMatchObject({
      automaticDeployEnabled: false,
    });
    expect(mockPost).toHaveBeenCalledWith('/admin/deployment/automation', { enabled: false });
  });
});
