import { DeploymentTriggerMode } from '@claw/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deploymentRepository } from '@/repositories/admin/deployment.repository';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
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
  it('reads live run progress', async () => {
    const progress = { available: true, reason: null, run: null };
    mockGet.mockResolvedValue({ data: progress });

    await expect(deploymentRepository.getRun()).resolves.toBe(progress);
    expect(mockGet).toHaveBeenCalledWith('/admin/deployment/run');
  });

  it('puts credentials, token included, to the credentials endpoint', async () => {
    mockPut.mockResolvedValue({ data: { source: 'database' } });

    await deploymentRepository.saveCredentials({
      repository: 'ihabkhaled/ClawAI',
      ref: 'main',
      token: 'github_pat_11ABCDEFG0123456789',
    });

    expect(mockPut).toHaveBeenCalledWith('/admin/deployment/credentials', {
      repository: 'ihabkhaled/ClawAI',
      ref: 'main',
      token: 'github_pat_11ABCDEFG0123456789',
    });
  });

  it('deletes the stored credentials', async () => {
    mockDelete.mockResolvedValue({ data: { cleared: true, source: 'none' } });

    await expect(deploymentRepository.clearCredentials()).resolves.toMatchObject({ cleared: true });
    expect(mockDelete).toHaveBeenCalledWith('/admin/deployment/credentials');
  });
});
