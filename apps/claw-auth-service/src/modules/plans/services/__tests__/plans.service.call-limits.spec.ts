import { type Mock, vi } from 'vitest';
import type { RabbitMQService } from '@claw/shared-rabbitmq';
import { PlansService } from '../plans.service';
import { type PlansRepository } from '../../repositories/plans.repository';
import { type ExposedModelClient } from '../../clients/exposed-model.client';
import { PlanModelAccessMode } from '../../../../generated/prisma';

// ADR-197: the three per-call limit columns round-trip through the plan view.
const row = (over: Record<string, unknown> = {}) => ({
  id: 'plan-x',
  name: 'X',
  slug: 'x',
  description: null,
  priceMonthly: null,
  priceYearly: null,
  currency: 'USD',
  displayOrder: 0,
  isDefault: false,
  isPopular: false,
  popularKey: null,
  isActive: true,
  isPublic: true,
  dailyTokenQuota: 50000,
  weeklyTokenQuota: null,
  monthlyTokenQuota: null,
  allowWorkspaces: true,
  modelAccessMode: PlanModelAccessMode.ALLOW_ALL,
  allowedCostClasses: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  modelAccess: [],
  maxInputTokensPerCall: null,
  maxOutputTokensPerCall: null,
  maxCostPerCallMicroUsd: null,
  ...over,
});

describe('PlansService per-call limits', () => {
  let service: PlansService;
  let repo: { findById: Mock; findBySlug: Mock; create: Mock; update: Mock };

  beforeEach(() => {
    repo = { findById: vi.fn(), findBySlug: vi.fn(), create: vi.fn(), update: vi.fn() };
    service = new PlansService(
      repo as unknown as PlansRepository,
      { findExposed: vi.fn() } as unknown as ExposedModelClient,
      { publish: vi.fn() } as unknown as RabbitMQService,
    );
  });

  it('returns null for every limit when none is set', async () => {
    repo.findById.mockResolvedValue(row());
    const view = await service.getPlan('plan-x');
    expect(view.maxInputTokensPerCall).toBeNull();
    expect(view.maxOutputTokensPerCall).toBeNull();
    expect(view.maxCostPerCallMicroUsd).toBeNull();
  });

  it('returns the cost as a plain number even though the column is a BigInt', async () => {
    repo.findById.mockResolvedValue(
      row({
        maxInputTokensPerCall: 8000,
        maxOutputTokensPerCall: 0,
        maxCostPerCallMicroUsd: 50_000n,
      }),
    );
    const view = await service.getPlan('plan-x');
    expect(view.maxInputTokensPerCall).toBe(8000);
    expect(view.maxOutputTokensPerCall).toBe(0);
    expect(view.maxCostPerCallMicroUsd).toBe(50_000);
  });

  it('passes the limits to the repository on create and update, null clearing a cap', async () => {
    repo.findBySlug.mockResolvedValue(null);
    repo.create.mockResolvedValue(row({ maxCostPerCallMicroUsd: 1_000n }));
    const created = await service.createPlan({
      name: 'X',
      slug: 'x',
      dailyTokenQuota: 1,
      maxCostPerCallMicroUsd: 1_000,
    } as never);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ maxCostPerCallMicroUsd: 1_000 }),
    );
    expect(created.maxCostPerCallMicroUsd).toBe(1_000);

    repo.findById.mockResolvedValue(row({ maxInputTokensPerCall: 8000 }));
    repo.update.mockResolvedValue(row());
    const updated = await service.updatePlan('plan-x', { maxInputTokensPerCall: null });
    expect(repo.update).toHaveBeenCalledWith('plan-x', { maxInputTokensPerCall: null });
    expect(updated.maxInputTokensPerCall).toBeNull();
  });
});
