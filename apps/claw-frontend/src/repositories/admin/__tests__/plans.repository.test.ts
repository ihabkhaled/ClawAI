import { beforeEach, describe, expect, it, vi } from 'vitest';

import { plansRepository } from '@/repositories/admin/plans.repository';
import type {
  CreatePlanRequest,
  PlanView,
  ReorderPlansRequest,
  UpdatePlanModelAccessRequest,
  UpdatePlanRequest,
} from '@/types';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockPut = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

const samplePlan = { id: 'pl1', name: 'Pro' } as unknown as PlanView;

describe('plans repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list GETs the base path and returns parsed data', async () => {
    mockGet.mockResolvedValue({ data: [samplePlan] });
    const result = await plansRepository.list();
    expect(mockGet).toHaveBeenCalledWith('/admin/plans');
    expect(result).toEqual([samplePlan]);
  });

  it('get GETs the encoded id path', async () => {
    mockGet.mockResolvedValue({ data: samplePlan });
    const result = await plansRepository.get('p 1');
    expect(mockGet).toHaveBeenCalledWith('/admin/plans/p%201');
    expect(result).toEqual(samplePlan);
  });

  it('create POSTs the payload to the base path', async () => {
    mockPost.mockResolvedValue({ data: samplePlan });
    const payload = { name: 'Pro', slug: 'pro', dailyTokenQuota: 1000 } as CreatePlanRequest;
    const result = await plansRepository.create(payload);
    expect(mockPost).toHaveBeenCalledWith('/admin/plans', payload);
    expect(result).toEqual(samplePlan);
  });

  it('update PATCHes the payload to the encoded id path', async () => {
    mockPatch.mockResolvedValue({ data: samplePlan });
    const payload = { name: 'Renamed' } as UpdatePlanRequest;
    const result = await plansRepository.update('p 1', payload);
    expect(mockPatch).toHaveBeenCalledWith('/admin/plans/p%201', payload);
    expect(result).toEqual(samplePlan);
  });

  it('activate POSTs to the activate sub-path', async () => {
    mockPost.mockResolvedValue({ data: samplePlan });
    const result = await plansRepository.activate('p/1');
    expect(mockPost).toHaveBeenCalledWith('/admin/plans/p%2F1/activate');
    expect(result).toEqual(samplePlan);
  });

  it('deactivate POSTs to the deactivate sub-path', async () => {
    mockPost.mockResolvedValue({ data: samplePlan });
    const result = await plansRepository.deactivate('p1');
    expect(mockPost).toHaveBeenCalledWith('/admin/plans/p1/deactivate');
    expect(result).toEqual(samplePlan);
  });

  it('setDefault POSTs to the set-default sub-path', async () => {
    mockPost.mockResolvedValue({ data: samplePlan });
    const result = await plansRepository.setDefault('p1');
    expect(mockPost).toHaveBeenCalledWith('/admin/plans/p1/set-default');
    expect(result).toEqual(samplePlan);
  });

  it('reorder POSTs the payload to the reorder path', async () => {
    mockPost.mockResolvedValue({ data: [samplePlan] });
    const payload: ReorderPlansRequest = { orderedIds: ['a', 'b'] };
    const result = await plansRepository.reorder(payload);
    expect(mockPost).toHaveBeenCalledWith('/admin/plans/reorder', payload);
    expect(result).toEqual([samplePlan]);
  });

  it('updateModelAccess PUTs the payload to the model-access sub-path', async () => {
    mockPut.mockResolvedValue({ data: samplePlan });
    const payload: UpdatePlanModelAccessRequest = {
      models: [{ provider: 'openai', model: 'gpt-4o' }],
    };
    const result = await plansRepository.updateModelAccess('p 1', payload);
    expect(mockPut).toHaveBeenCalledWith('/admin/plans/p%201/model-access', payload);
    expect(result).toEqual(samplePlan);
  });

  it('listUsers GETs the users sub-path', async () => {
    mockGet.mockResolvedValue({ data: { userIds: ['u1', 'u2'] } });
    const result = await plansRepository.listUsers('p1');
    expect(mockGet).toHaveBeenCalledWith('/admin/plans/p1/users');
    expect(result).toEqual({ userIds: ['u1', 'u2'] });
  });

  it('assignUser POSTs the planId to the encoded user assign path', async () => {
    mockPost.mockResolvedValue({ data: samplePlan });
    const result = await plansRepository.assignUser('u 1', 'pl1');
    expect(mockPost).toHaveBeenCalledWith('/admin/plans/users/u%201/assign', { planId: 'pl1' });
    expect(result).toEqual(samplePlan);
  });
});
